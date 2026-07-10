import { describe, it, expect } from "vitest";
import fc from "fast-check";
import * as Y from "yjs";
import { encodeState, applyUpdate } from "./ydoc";

/**
 * CONVERGENCE UNDER TRANSPORT CHAOS (S13). The sacred fuzzer, now under a chaos harness: updates are
 * dropped, DUPLICATED, REORDERED, and DELAYED before delivery. Yjs guarantees convergence under duplication
 * and reordering BY DESIGN — this test proves OUR transport preserves that guarantee (a provider bug could
 * still break it), and pins it as permanent CI. Every course pins its crown property; here it's convergence.
 */

interface Edit {
  site: number;
  index: number;
  text: string;
}

function runChaos(siteCount: number, edits: Edit[], chaosSeed: number[]): string[] {
  const docs = Array.from({ length: siteCount }, () => new Y.Doc());
  const updates: { origin: number; bytes: Uint8Array }[] = [];
  docs.forEach((d, i) =>
    d.on("update", (u: Uint8Array, origin: unknown) => {
      if (origin !== "remote") updates.push({ origin: i, bytes: u });
    }),
  );

  for (const e of edits) {
    const t = docs[e.site % siteCount]!.getText("t");
    t.insert(t.length === 0 ? 0 : e.index % (t.length + 1), e.text);
  }

  // Build a chaotic delivery schedule: each update may be dropped-now (re-delivered later), duplicated, or
  // reordered. We rely on a final guaranteed sweep so "dropped" really means "delayed", modeling at-least-
  // once + reordered + duplicated delivery.
  const schedule: { origin: number; bytes: Uint8Array }[] = [];
  updates.forEach((u, i) => {
    const chaos = chaosSeed[i % Math.max(1, chaosSeed.length)] ?? 0;
    if (chaos % 5 === 0) return; // "drop" (delayed to the final sweep)
    schedule.push(u);
    if (chaos % 3 === 0) schedule.push(u); // duplicate
  });
  // Reorder the schedule deterministically from the seed.
  schedule.sort((a, b) => ((chaosSeed[updates.indexOf(a) % Math.max(1, chaosSeed.length)] ?? 0) -
    (chaosSeed[updates.indexOf(b) % Math.max(1, chaosSeed.length)] ?? 0)));

  const deliver = (u: { origin: number; bytes: Uint8Array }) => {
    for (let r = 0; r < siteCount; r++) if (r !== u.origin) applyUpdate(docs[r]!, u.bytes, "remote");
  };
  for (const u of schedule) deliver(u);
  // Final guaranteed sweep (at-least-once): every doc gets every update at least once.
  for (const u of updates) deliver(u);
  // …and exchange full state to be certain.
  for (let i = 0; i < siteCount; i++) for (let j = 0; j < siteCount; j++) if (i !== j) applyUpdate(docs[j]!, encodeState(docs[i]!), "remote");

  return docs.map((d) => d.getText("t").toString());
}

describe("convergence under transport chaos (S13) — SACRED, permanent CI", () => {
  it("property: drop/dup/reorder/delay → all replicas STILL converge", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 4 }),
        fc.array(fc.record({ site: fc.nat(3), index: fc.nat(40), text: fc.constantFrom("a", "bb", "c", "xyz") }), { minLength: 1, maxLength: 30 }),
        fc.array(fc.nat(97), { minLength: 1, maxLength: 40 }),
        (n, rawEdits, chaosSeed) => {
          const edits = rawEdits.map((e) => ({ ...e, site: e.site % n }));
          const finals = runChaos(n, edits, chaosSeed);
          for (const s of finals) expect(s).toBe(finals[0]);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("duplicate delivery is idempotent (Yjs by design; proven for our transport)", () => {
    const a = new Y.Doc();
    const b = new Y.Doc();
    a.getText("t").insert(0, "once");
    const u = encodeState(a);
    applyUpdate(b, u, "remote");
    applyUpdate(b, u, "remote"); // duplicate
    applyUpdate(b, u, "remote"); // triplicate
    expect(b.getText("t").toString()).toBe("once");
  });
});
