import * as Y from "yjs";
import type { WebSocket } from "ws";
import {
  readSyncMessage,
  writeUpdate,
  isSyncMessage,
  type WireMessage,
} from "@folio/collab";

/**
 * Authoritative Yjs rooms (S07). Unlike S05's dumb whole-doc fan-out, the server now holds the AUTHORITATIVE
 * Y.Doc per document. On a client's sync1 it replies with exactly the delta they lack; on an update it
 * merges into its own doc, persists it, and relays to the other clients. Awareness (presence/cursors) is
 * relayed but NEVER applied to the doc — it's ephemeral.
 *
 * 🔗 The Tracer sync-spine pattern (a durable log + pub/sub fan-out), now carrying CRDT updates instead of
 * domain events. Across multiple server instances, `onPersist` would also publish to Redis so peers on
 * other instances receive the update (wired via the persistence hook; single-instance here).
 */
interface Room {
  doc: Y.Doc;
  sockets: Set<WebSocket>;
}

export class YRooms {
  private readonly rooms = new Map<string, Room>();
  private readonly socketDoc = new Map<WebSocket, string>();
  /** Per-socket edit permission — re-checked on EVERY mutating message, not just at connect (flaw #5 fix). */
  private readonly canEditSocket = new Map<WebSocket, boolean>();

  constructor(
    /** Load a doc's persisted Yjs update (from the DB log/snapshot). Returns null for a brand-new doc. */
    private readonly load: (docId: string) => Promise<Uint8Array | null>,
    /** Persist a doc's latest state (append to the update log / write a snapshot; Redis-publish for fanout). */
    private readonly onPersist: (docId: string, update: Uint8Array) => void,
  ) {}

  async join(docId: string, socket: WebSocket, canEdit = true): Promise<Y.Doc> {
    this.canEditSocket.set(socket, canEdit);
    let room = this.rooms.get(docId);
    if (!room) {
      const doc = new Y.Doc();
      const persisted = await this.load(docId).catch(() => null);
      if (persisted) Y.applyUpdate(doc, persisted);
      // Every local merge is persisted and relayed to the room.
      doc.on("update", (update: Uint8Array, origin: unknown) => {
        this.onPersist(docId, Y.encodeStateAsUpdate(doc));
        if (origin !== "persist") this.broadcast(docId, writeUpdate(update), origin as WebSocket | undefined);
      });
      room = { doc, sockets: new Set() };
      this.rooms.set(docId, room);
    }
    room.sockets.add(socket);
    this.socketDoc.set(socket, docId);
    return room.doc;
  }

  /**
   * Re-authorize a socket mid-session. When a member's ACL changes (demoted to viewer), the server updates
   * their live socket's edit permission — so the NEXT update message they send is rejected. Harvest of flaw
   * #5: a WebSocket outlives a permission change, so authorization must follow the change onto the wire.
   */
  setCanEdit(socket: WebSocket, canEdit: boolean): void {
    this.canEditSocket.set(socket, canEdit);
  }

  /** Handle one wire message from a socket. */
  handle(socket: WebSocket, msg: WireMessage): void {
    const docId = this.socketDoc.get(socket);
    if (!docId) return;
    const room = this.rooms.get(docId);
    if (!room) return;

    if (isSyncMessage(msg)) {
      // ⚠️ FLAW #5 FIX — per-message authorization. A MUTATING message (sync2 = my delta, update = a new
      // change) is only applied if this socket STILL has edit permission RIGHT NOW. Authorizing at connect
      // was not enough: a socket outlives the permission that admitted it, so a user demoted mid-session
      // could keep editing on their open socket. sync1 (a read/state-vector request) is always allowed.
      const mutating = msg.type === "sync2" || msg.type === "update";
      if (mutating && this.canEditSocket.get(socket) !== true) {
        return; // silently drop unauthorized edits — the demoted user's socket can no longer write
      }
      // Tag the origin as this socket so the doc.on('update') relay doesn't echo it back to the sender.
      // Wrapped so a MALFORMED update from a client can't crash the room (untrusted-input discipline, S13).
      try {
        const reply = readSyncMessage(room.doc, msg, socket);
        if (reply) this.sendTo(socket, reply);
      } catch {
        /* quarantine: a garbage update is dropped, the live doc + server stay intact */
      }
    } else {
      // Awareness: relay to everyone else; never touch the doc.
      this.broadcast(docId, msg, socket);
    }
  }

  leave(socket: WebSocket): void {
    const docId = this.socketDoc.get(socket);
    this.socketDoc.delete(socket);
    this.canEditSocket.delete(socket);
    if (!docId) return;
    const room = this.rooms.get(docId);
    room?.sockets.delete(socket);
    if (room && room.sockets.size === 0) this.rooms.delete(docId); // free the doc when empty
  }

  private broadcast(docId: string, msg: WireMessage, except?: WebSocket): void {
    const room = this.rooms.get(docId);
    if (!room) return;
    for (const s of room.sockets) if (s !== except) this.sendTo(s, msg);
  }

  private sendTo(socket: WebSocket, msg: WireMessage): void {
    if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(msg));
  }
}
