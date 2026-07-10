import { describe, it, expect } from "vitest";
import * as Y from "yjs";
import { Provider, type Transport } from "./provider";
import { readSyncMessage, writeUpdate, type SyncMessage } from "./protocol";

/**
 * The reconnect-gap arc (S07, in-PR). A test transport lets us control exactly when messages arrive, so we
 * can force the nasty case: a live update lands DURING the sync handshake. The correct provider buffers it;
 * a naive "drop until synced" provider loses it and diverges. 🔗 Tracer S6's bootstrap-gap race, CRDT-shaped.
 */

/** A controllable client-side transport: the test decides when the provider "receives" each message. */
class TestTransport implements Transport {
  private msgHandler: ((m: SyncMessage) => void) | null = null;
  private openHandler: (() => void) | null = null;
  outbox: SyncMessage[] = []; // messages the provider sent toward the server

  send(msg: SyncMessage): void {
    this.outbox.push(msg);
  }
  onMessage(cb: (m: SyncMessage) => void): void {
    this.msgHandler = cb;
  }
  onOpen(cb: () => void): void {
    this.openHandler = cb;
  }
  open(): void {
    this.openHandler?.();
  }
  /** Deliver a single message to the provider, now. */
  receive(msg: SyncMessage): void {
    this.msgHandler?.(msg);
  }
}

describe("Provider reconnect gap (S07)", () => {
  it("an update that arrives DURING the sync handshake is NOT dropped", () => {
    // Server side: authoritative doc with initial content, and it's about to make one more edit.
    const server = new Y.Doc();
    server.getText("t").insert(0, "hello");

    const client = new Y.Doc();
    const transport = new TestTransport();
    const provider = new Provider(client, transport);
    provider.connect();
    transport.open(); // fires onOpen → provider sends sync1

    // The provider announced its (empty) state vector as sync1.
    const sync1 = transport.outbox.shift()!;
    expect(sync1.type).toBe("sync1");

    // Server computes the delta (sync2) for the client's sv…
    const sync2 = readSyncMessage(server, sync1)!;
    // …but BEFORE the client processes sync2, the server makes a new edit and relays it as an update.
    let liveUpdate: SyncMessage | null = null;
    server.on("update", (u: Uint8Array) => (liveUpdate = writeUpdate(u)));
    server.getText("t").insert(5, " world");

    // Network reorders: the live update reaches the client FIRST (mid-handshake, synced === false)…
    transport.receive(liveUpdate!);
    // …then the sync2 handshake reply lands.
    transport.receive(sync2);

    // Correct provider: buffered the gap update, applied it after sync → fully converged.
    expect(provider.isSynced).toBe(true);
    expect(client.getText("t").toString()).toBe("hello world");
    expect(client.getText("t").toString()).toBe(server.getText("t").toString());
  });

  it("steady-state updates relay after sync", () => {
    const server = new Y.Doc();
    const client = new Y.Doc();
    const transport = new TestTransport();
    new Provider(client, transport).connect();
    transport.open();

    // Complete the handshake (empty server → empty delta).
    const sync1 = transport.outbox.shift()!;
    transport.receive(readSyncMessage(server, sync1)!);

    // From here, relay EVERY server update to the client.
    const capture: SyncMessage[] = [];
    server.on("update", (u: Uint8Array) => capture.push(writeUpdate(u)));
    server.getText("t").insert(0, "later");
    server.getText("t").insert(5, "!");
    for (const m of capture) transport.receive(m);
    expect(client.getText("t").toString()).toBe("later!");
  });
});
