import { describe, it, expect } from "vitest";
import { RGA } from "./rga";

describe("crdt-101 RGA insert (S06)", () => {
  it("appends characters in order on a single replica", () => {
    const r = new RGA("a");
    "hello".split("").forEach((c, i) => r.insert(i, c));
    expect(r.toString()).toBe("hello");
  });

  it("inserts in the middle", () => {
    const r = new RGA("a");
    r.insert(0, "a");
    r.insert(1, "c");
    r.insert(1, "b"); // between a and c
    expect(r.toString()).toBe("abc");
  });

  it("two concurrent inserts at the same origin converge and keep BOTH (the S05 fix)", () => {
    const a = new RGA("a");
    const b = new RGA("b");
    const opA = a.insert(0, "A");
    const opB = b.insert(0, "B");
    a.apply(opB);
    b.apply(opA);
    expect(a.toString()).toBe(b.toString()); // converged
    expect(a.length).toBe(2); // no clobber — both survive
  });

  it("apply is idempotent — replaying an op changes nothing", () => {
    const a = new RGA("a");
    const op = a.insert(0, "x");
    a.apply(op);
    a.apply(op);
    expect(a.toString()).toBe("x");
  });

  it("deletes a char (single replica)", () => {
    const r = new RGA("a");
    "abc".split("").forEach((c, i) => r.insert(i, c));
    r.deleteAt(1); // remove "b"
    expect(r.toString()).toBe("ac");
  });

  it("buffers an insert whose origin hasn't arrived, then integrates it (causal readiness)", () => {
    const src = new RGA("a");
    const o1 = src.insert(0, "x");
    const o2 = src.insert(1, "y"); // origin = x

    const dst = new RGA("b");
    dst.apply(o2); // arrives BEFORE its origin — must buffer, not crash
    expect(dst.toString()).toBe("");
    dst.apply(o1); // origin arrives — buffered op drains
    expect(dst.toString()).toBe("xy");
  });
});
