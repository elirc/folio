import { describe, it, expect } from "vitest";
import fc from "fast-check";
import * as Y from "yjs";
import { replay, reconstructAt, compact, snapshot, loadFromSnapshot, restoreAsUpdate } from "./history";

/** Record every update a doc emits as we build an edit log. */
function editLog(edits: ((t: Y.Text) => void)[]): { updates: Uint8Array[]; final: string } {
  const doc = new Y.Doc();
  const updates: Uint8Array[] = [];
  doc.on("update", (u: Uint8Array) => updates.push(u));
  const t = doc.getText("t");
  for (const e of edits) e(t);
  return { updates, final: t.toString() };
}

describe("update log = history (S10)", () => {
  it("replaying the full log reconstructs the document", () => {
    const { updates, final } = editLog([(t) => t.insert(0, "hello"), (t) => t.insert(5, " world")]);
    expect(replay(updates).getText("t").toString()).toBe(final);
  });

  it("reconstructAt gives any past version — free time-travel from the log", () => {
    const { updates } = editLog([
      (t) => t.insert(0, "one"),
      (t) => t.insert(3, " two"),
      (t) => t.insert(7, " three"),
    ]);
    expect(reconstructAt(updates, 1).getText("t").toString()).toBe("one");
    expect(reconstructAt(updates, 2).getText("t").toString()).toBe("one two");
    expect(reconstructAt(updates, 3).getText("t").toString()).toBe("one two three");
  });
});

describe("compaction (S10 — harvest of flaw #4)", () => {
  it("documents flaw #4: the naive log grows one entry PER edit (unbounded)", () => {
    const { updates } = editLog(Array.from({ length: 100 }, (_, i) => (t: Y.Text) => t.insert(t.length, String(i % 10))));
    // 100 edits ⇒ ~100 log entries. A year-old doc has millions; load-by-full-replay degrades linearly.
    expect(updates.length).toBeGreaterThanOrEqual(100);
  });

  it("compaction collapses the log into ONE snapshot that loads far cheaper", () => {
    const { updates, final } = editLog(Array.from({ length: 200 }, (_, i) => (t: Y.Text) => t.insert(t.length, String(i % 7))));
    const snap = compact(updates); // 200 updates → 1
    const loaded = new Y.Doc();
    Y.applyUpdate(loaded, snap);
    expect(loaded.getText("t").toString()).toBe(final);
    // The compacted snapshot is a single blob; loading applies ONE update instead of 200.
    expect(snap.byteLength).toBeLessThan(updates.reduce((n, u) => n + u.byteLength, 0));
  });

  it("⚠️ PROPERTY: compacted load ≡ full-replay load (a compaction bug corrupts history)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ at: fc.nat(50), text: fc.constantFrom("a", "bb", "c", "z") }), { minLength: 1, maxLength: 60 }),
        (edits) => {
          const { updates, final } = editLog(
            edits.map((e) => (t: Y.Text) => t.insert(t.length === 0 ? 0 : e.at % (t.length + 1), e.text)),
          );
          const compacted = new Y.Doc();
          Y.applyUpdate(compacted, compact(updates));
          // compacted state MUST equal both full replay and the original.
          expect(compacted.getText("t").toString()).toBe(final);
          expect(compacted.getText("t").toString()).toBe(replay(updates).getText("t").toString());
        },
      ),
      { numRuns: 150 },
    );
  });

  it("snapshot + tail loads identically to full replay (the load model)", () => {
    const { updates, final } = editLog(Array.from({ length: 20 }, (_, i) => (t: Y.Text) => t.insert(t.length, String(i))));
    const snap = compact(updates.slice(0, 15)); // snapshot the first 15…
    const loaded = loadFromSnapshot(snap, updates.slice(15)); // …+ replay the tail
    expect(loaded.getText("t").toString()).toBe(final);
    expect(snapshot(loaded).byteLength).toBeGreaterThan(0);
  });
});

describe("restore is CRDT-consistent, not a destructive rewind (S10)", () => {
  it("restoring an old version moves the doc FORWARD (append), converging with concurrent editors", () => {
    // Build a doc, snapshot an early version, keep editing.
    const doc = new Y.Doc();
    const t = doc.getText("t");
    t.insert(0, "v1 content");
    const oldSnap = snapshot(doc);
    t.insert(t.length, " — v2 additions");

    // A concurrent editor exists with the current (v2) state.
    const peer = new Y.Doc();
    Y.applyUpdate(peer, snapshot(doc));

    // Restore v1: computed as a forward update, applied to BOTH — they converge (no rewind, no lost peer).
    const restore = restoreAsUpdate(doc, oldSnap);
    Y.applyUpdate(doc, restore);
    Y.applyUpdate(peer, restore);
    expect(doc.getText("t").toString()).toBe(peer.getText("t").toString()); // converged, not diverged
    expect(() => Y.applyUpdate(peer, restore)).not.toThrow(); // idempotent, safe
  });
});
