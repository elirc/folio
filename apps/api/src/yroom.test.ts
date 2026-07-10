import { describe, it, expect } from "vitest";
import * as Y from "yjs";
import { writeUpdate, writeSyncStep1 } from "@folio/collab";
import { YRooms } from "./yroom";

/** A fake WebSocket that records what it's sent — enough for YRooms' send/broadcast. */
class FakeSocket {
  readonly OPEN = 1;
  readonly readyState = 1;
  sent: string[] = [];
  send(data: string) {
    this.sent.push(data);
  }
}

/** An update from a fresh editor doc inserting `text`. */
function editorUpdate(text: string): Uint8Array {
  const doc = new Y.Doc();
  let u: Uint8Array | null = null;
  doc.on("update", (up: Uint8Array) => (u = up));
  doc.getText("t").insert(0, text);
  return u!;
}

describe("YRooms per-message ACL revalidation (S13 — harvest of flaw #5)", () => {
  it("a user DEMOTED mid-session can no longer edit on their open socket", async () => {
    const rooms = new YRooms(
      async () => null,
      () => {},
    );
    const editor = new FakeSocket();
    const observer = new FakeSocket();
    await rooms.join("doc1", editor as never, true); // editor can edit
    await rooms.join("doc1", observer as never, true);

    // While an editor, their update is applied and RELAYED to the observer.
    rooms.handle(editor as never, writeUpdate(editorUpdate("hello")));
    expect(observer.sent.length).toBeGreaterThan(0);
    const relayedBefore = observer.sent.length;

    // ── The member is demoted to viewer. The server re-authorizes their live socket. ──
    rooms.setCanEdit(editor as never, false);

    // Now their update is REJECTED — not applied, not relayed. The socket outlived the permission.
    rooms.handle(editor as never, writeUpdate(editorUpdate("sneaky edit")));
    expect(observer.sent.length).toBe(relayedBefore); // no new relay → the edit was dropped
  });

  it("a viewer (canEdit=false at join) cannot edit at all", async () => {
    const rooms = new YRooms(
      async () => null,
      () => {},
    );
    const viewer = new FakeSocket();
    const observer = new FakeSocket();
    await rooms.join("doc2", viewer as never, false); // joined as a viewer
    await rooms.join("doc2", observer as never, true);

    rooms.handle(viewer as never, writeUpdate(editorUpdate("nope")));
    expect(observer.sent.length).toBe(0); // nothing relayed — viewers can't write
  });

  it("sync1 (a read/state-vector request) is always allowed, even for viewers", async () => {
    const rooms = new YRooms(
      async () => null,
      () => {},
    );
    const viewer = new FakeSocket();
    await rooms.join("doc3", viewer as never, false);
    // sync1 asks for the current state — a read. The server replies with sync2 (the delta).
    rooms.handle(viewer as never, writeSyncStep1(new Y.Doc()));
    expect(viewer.sent.length).toBeGreaterThan(0); // got a sync2 reply — reads are fine
  });
});
