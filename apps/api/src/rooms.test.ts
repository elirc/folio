import { describe, it, expect } from "vitest";
import { Rooms } from "./rooms";

const u = (id: string) => ({ id, name: id, color: "#000" });

describe("Rooms registry (S05)", () => {
  it("joins and lists peers", () => {
    const rooms = new Rooms<string>();
    rooms.join("d1", "s1", u("a"));
    rooms.join("d1", "s2", u("b"));
    expect(rooms.peers("d1")).toHaveLength(2);
  });

  it("others() excludes the sender (the broadcast set)", () => {
    const rooms = new Rooms<string>();
    rooms.join("d1", "s1", u("a"));
    rooms.join("d1", "s2", u("b"));
    expect(rooms.others("d1", "s1").map((m) => m.socket)).toEqual(["s2"]);
  });

  it("a socket is in at most one doc — rejoining moves it", () => {
    const rooms = new Rooms<string>();
    rooms.join("d1", "s1", u("a"));
    rooms.join("d2", "s1", u("a"));
    expect(rooms.docOf("s1")).toBe("d2");
    expect(rooms.peers("d1")).toHaveLength(0);
  });

  it("leave removes the socket and cleans up empty rooms", () => {
    const rooms = new Rooms<string>();
    rooms.join("d1", "s1", u("a"));
    expect(rooms.leave("s1")).toBe("d1");
    expect(rooms.peers("d1")).toHaveLength(0);
    expect(rooms.leave("s1")).toBeNull(); // idempotent
  });

  it("presence de-dupes by user id (same user, two tabs)", () => {
    const rooms = new Rooms<string>();
    rooms.join("d1", "s1", u("ann"));
    rooms.join("d1", "s2", u("ann")); // same user, second tab
    expect(rooms.presence("d1")).toHaveLength(1);
  });
});
