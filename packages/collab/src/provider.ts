import * as Y from "yjs";
import { readSyncMessage, writeSyncStep1, writeUpdate, type SyncMessage } from "./protocol";

/**
 * The provider client (S07) — the half the learner builds against the AI-authored protocol core. It owns
 * one document's connection: perform the sync handshake, apply remote updates, relay local changes, and —
 * critically — survive reconnection without losing updates that land during the sync gap.
 *
 * A `Transport` is any bidirectional channel (a WebSocket in the app; an in-memory pipe in tests).
 */
export interface Transport {
  send(msg: SyncMessage): void;
  onMessage(cb: (msg: SyncMessage) => void): void;
  onOpen(cb: () => void): void;
}

export class Provider {
  private synced = false;
  /** Remote updates that arrive BEFORE the initial sync completes — buffered, never dropped. */
  private gapBuffer: SyncMessage[] = [];
  private localListener: ((update: Uint8Array, origin: unknown) => void) | null = null;

  constructor(
    private readonly doc: Y.Doc,
    private readonly transport: Transport,
  ) {}

  connect(): void {
    this.transport.onMessage((msg) => this.onMessage(msg));
    this.transport.onOpen(() => this.startSync());
  }

  /**
   * Begin (or restart) the handshake. We announce our state vector and, until the peer's reply lands, treat
   * incoming updates as "gap" traffic to buffer — NOT to drop. Only after sync completes do we attach the
   * live local-update relay.
   *
   * ⚠️ THE RECONNECT GAP (in-PR arc, harvested below). The naive ordering — attach the live listener and
   * apply/ignore remote updates while the handshake is still in flight — silently drops any update that
   * arrives in the window between "I asked to sync" and "I finished syncing." The fix is ordering:
   * SYNC FULLY, THEN ATTACH. 🔗 The exact bootstrap-gap race from Tracer S6, CRDT-shaped.
   */
  private startSync(): void {
    this.synced = false;
    this.detachLocal();
    this.transport.send(writeSyncStep1(this.doc));
  }

  private onMessage(msg: SyncMessage): void {
    if (!this.synced && msg.type === "update") {
      // A live update arrived mid-handshake. Do NOT drop it — buffer until sync completes.
      this.gapBuffer.push(msg);
      return;
    }
    const reply = readSyncMessage(this.doc, msg, "remote");
    if (reply) this.transport.send(reply);
    if (msg.type === "sync2") this.finishSync();
  }

  private finishSync(): void {
    // Apply everything that arrived during the gap, in arrival order (order-independent for a CRDT).
    for (const buffered of this.gapBuffer) readSyncMessage(this.doc, buffered, "remote");
    this.gapBuffer = [];
    this.synced = true;
    this.attachLocal(); // only NOW do we start relaying local changes
  }

  private attachLocal(): void {
    this.localListener = (update, origin) => {
      if (origin !== "remote") this.transport.send(writeUpdate(update));
    };
    this.doc.on("update", this.localListener);
  }

  private detachLocal(): void {
    if (this.localListener) {
      this.doc.off("update", this.localListener);
      this.localListener = null;
    }
  }

  get isSynced(): boolean {
    return this.synced;
  }
}
