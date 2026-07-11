import { describe, it, expect } from "vitest";
import * as Y from "yjs";
import { encodeState, applyUpdate } from "./ydoc";
import { convergenceHealth } from "./health";

/**
 * THE SPLIT-BRAIN DRILL (S15) — the capstone's ultimate test, and the whole six-course arc made physical.
 *
 * 📘 A network partition is the scenario that DESTROYS naive systems. Two server instances get split; both
 * halves keep accepting edits to the same document; then the network heals. S05's last-write-wins would
 * silently pick one half and DISCARD the other — someone's work vanishes. A CRDT *converges*: both halves'
 * edits survive and reconcile into one consistent document. Understand the hard problem (S06), adopt the
 * right tool (S07), and the impossible-looking scenario becomes a non-event.
 *
 * This is the same two-client concurrent edit as S05's damning test — but now at the INFRASTRUCTURE level,
 * across partitioned server instances. The assertion that was `.not.toContain` in S05 is `.toContain` here.
 */
describe("split-brain drill (S15) — partition → both edit → heal → converge", () => {
  it("the network splits, both halves edit one doc, and it heals with NO lost edits", () => {
    // One document, replicated on two server instances (instanceA, instanceB), initially in sync.
    const base = new Y.Doc();
    base.getArray<string>("doc").insert(0, ["Shared opening line"]);
    const seed = encodeState(base);

    const instanceA = new Y.Doc();
    applyUpdate(instanceA, seed);
    const instanceB = new Y.Doc();
    applyUpdate(instanceB, seed);

    // ── PARTITION. The network splits; the instances can't talk. Users on each half keep editing. ──
    instanceA.getArray<string>("doc").push(["Edit from the A side of the partition"]);
    instanceA.getArray<string>("doc").push(["Another A edit"]);
    instanceB.getArray<string>("doc").push(["Edit from the B side of the partition"]);

    // During the partition the convergence monitor sees them as non-healthy (a real page in prod).
    expect(convergenceHealth(instanceA, instanceB)).not.toBe("healthy");

    // ── HEAL. The network comes back; the instances exchange their update logs. ──
    const aState = encodeState(instanceA);
    const bState = encodeState(instanceB);
    applyUpdate(instanceA, bState, "remote");
    applyUpdate(instanceB, aState, "remote");

    // Converged: identical documents, and EVERY edit from BOTH halves survived. S05's LWW could never.
    const a = instanceA.getArray<string>("doc").toArray();
    const b = instanceB.getArray<string>("doc").toArray();
    expect(a).toEqual(b); // one consistent document
    expect(a).toContain("Edit from the A side of the partition");
    expect(a).toContain("Another A edit");
    expect(a).toContain("Edit from the B side of the partition");
    expect(a).toHaveLength(4); // opening + 2 A-side + 1 B-side — nothing lost, nothing duplicated
    expect(convergenceHealth(instanceA, instanceB)).toBe("healthy"); // the monitor clears
  });

  it("healing is order- and duplication-independent (a messy reunion still converges)", () => {
    const seed = encodeState(new Y.Doc());
    const a = new Y.Doc();
    applyUpdate(a, seed);
    const b = new Y.Doc();
    applyUpdate(b, seed);
    a.getText("t").insert(0, "AAA");
    b.getText("t").insert(0, "BBB");

    // Heal with duplicated + reordered exchanges — Yjs converges regardless.
    const aU = encodeState(a);
    const bU = encodeState(b);
    applyUpdate(b, aU, "remote");
    applyUpdate(b, aU, "remote"); // duplicate
    applyUpdate(a, bU, "remote");
    expect(a.getText("t").toString()).toBe(b.getText("t").toString());
    expect(a.getText("t").length).toBe(6);
  });
});
