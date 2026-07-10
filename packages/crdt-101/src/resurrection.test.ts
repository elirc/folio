import { describe, it, expect } from "vitest";
import { RGA } from "./rga";

/**
 * The tombstone bug, pinned deterministically (S06, in-PR arc). The fuzzer found this; here it is as a
 * minimal, readable reproduction so the lesson is unmissable.
 *
 * ⚠️ THE RESURRECTION / DISAPPEARANCE. With HARD delete, a character that is deleted on one replica while a
 * concurrent insert elsewhere references it as an origin cannot be placed consistently: the replica that
 * deleted it has forgotten its id, so the concurrent insert has no anchor and the replicas DIVERGE. You
 * literally cannot delete in a CRDT — a concurrent op may still reference the "deleted" element. The fix is
 * a TOMBSTONE: keep the element, flag it invisible, so its identity survives as an anchor forever.
 *
 * Against the hard-delete implementation this test FAILS (replicas diverge). Against tombstones it PASSES.
 */
describe("crdt-101 tombstone requirement (S06)", () => {
  it("delete + concurrent insert-after-the-deleted-char still converges", () => {
    // Two replicas both know the char "X".
    const a = new RGA("a");
    const opX = a.insert(0, "X"); // "X"
    const b = new RGA("b");
    b.apply(opX); // b also has "X"

    // Replica A deletes X. Concurrently, replica B inserts "Y" right after X (origin = X).
    const opDelX = a.deleteAt(0)!; // A: "" (X gone)
    const opY = b.insert(1, "Y"); // B: "XY" (Y's originLeft = X)

    // The updates cross the wire.
    a.apply(opY); // A must place Y, whose origin X it just hard-deleted…
    b.apply(opDelX); // B removes X → "Y"

    // Convergence: both replicas must show the SAME text. (Hard delete diverges here; tombstones don't.)
    expect(a.toString()).toBe(b.toString());
    // And Y — a live character no one deleted — must survive on both.
    expect(a.toString()).toBe("Y");
  });
});
