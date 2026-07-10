import { describe, it, expect } from "vitest";
import * as Y from "yjs";
import { bigDoc, simulateCursors } from "./loadgen";

/**
 * THE LATENCY-BUDGET GATE (S12). The S04 budget (≤16ms/keystroke, ~flat at scale) becomes an ENFORCED CI
 * check here — instrument in S04, enforce in S12, exactly the Tracer arc. 🔗
 *
 * We assert two things. The robust, non-flaky core is a STRUCTURAL guarantee: a keystroke on a 10k-block
 * document produces an O(edit)-sized update, NOT an O(document)-sized one — that's *why* the budget holds at
 * scale (it's the harvest of flaw #4's "load/edit cost degrades with size" at the edit layer). We add a
 * generous wall-clock smoke check on top, kept loose so CI noise can't flap it.
 */
describe("perf budget: keystroke cost is bounded at scale (S12)", () => {
  it("a keystroke on a 10k-block doc emits an O(edit) update, not O(document)", () => {
    const doc = bigDoc(10_000);
    let lastUpdate: Uint8Array | null = null;
    doc.on("update", (u: Uint8Array) => (lastUpdate = u));

    // Type one character into the first block.
    const firstBlock = doc.getXmlFragment("prosemirror").get(0) as Y.XmlElement;
    (firstBlock.get(0) as Y.XmlText).insert(0, "x");

    expect(lastUpdate).not.toBeNull();
    // The incremental update for one character is tiny — independent of the 10k-block document size. If this
    // were O(document) (e.g. a whole-doc resend, the S05 model), it would be tens of KB and the budget would
    // be impossible at scale.
    expect(lastUpdate!.byteLength).toBeLessThan(200);
  });

  it("applying a keystroke to a 10k-block doc stays well under a generous frame budget", () => {
    const doc = bigDoc(10_000);
    const firstBlock = doc.getXmlFragment("prosemirror").get(0) as Y.XmlElement;
    const text = firstBlock.get(0) as Y.XmlText;

    const start = performance.now();
    for (let i = 0; i < 20; i++) text.insert(0, "a"); // 20 keystrokes
    const perKeystroke = (performance.now() - start) / 20;

    // Budget is 16ms; we assert a generous 16ms average even including test overhead, and the structural
    // test above is the real guarantee. (CI machines are noisy; keep the threshold loose, not tight.)
    expect(perKeystroke).toBeLessThan(16);
  });

  it("50 simulated cursors is a bounded, list-sized workload (batching keeps renders to one/frame)", () => {
    const cursors = simulateCursors(50, 100_000);
    // The cursor set is O(users), not O(document) — the render storm is solved by coalescing (batch.ts),
    // not by the data size. This documents the shape the awareness batcher must handle.
    expect(cursors).toHaveLength(50);
    expect(cursors.every((c) => c.index >= 0 && c.index < 100_000)).toBe(true);
  });
});
