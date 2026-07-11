import { describe, it, expect } from "vitest";
import { YRooms } from "./yroom";

class FakeSocket {
  readonly OPEN = 1;
  readonly readyState = 1;
  closed: { code: number; reason: string } | null = null;
  sent: string[] = [];
  send(d: string) {
    this.sent.push(d);
  }
  close(code: number, reason: string) {
    this.closed = { code, reason };
  }
}

describe("graceful stateful deploy — drain (S15)", () => {
  it("persists every active doc's final state and evicts sockets with a draining code", async () => {
    const persisted: string[] = [];
    const rooms = new YRooms(
      async () => null,
      (docId) => persisted.push(docId),
    );
    const s1 = new FakeSocket();
    const s2 = new FakeSocket();
    await rooms.join("docA", s1 as never, true);
    await rooms.join("docB", s2 as never, true);
    expect(rooms.activeDocCount).toBe(2);

    await rooms.drain(4001);

    // Both docs' final state was flushed before eviction.
    expect(persisted).toContain("docA");
    expect(persisted).toContain("docB");
    // Sockets were closed with the draining code, so clients reconnect (to the new instance).
    expect(s1.closed).toEqual({ code: 4001, reason: "draining" });
    expect(s2.closed).toEqual({ code: 4001, reason: "draining" });
  });

  it("exposes ops metrics (active docs, per-doc connections)", async () => {
    const rooms = new YRooms(
      async () => null,
      () => {},
    );
    const a = new FakeSocket();
    const b = new FakeSocket();
    await rooms.join("doc1", a as never, true);
    await rooms.join("doc1", b as never, true);
    expect(rooms.activeDocCount).toBe(1);
    expect(rooms.connectionCount("doc1")).toBe(2);
  });
});
