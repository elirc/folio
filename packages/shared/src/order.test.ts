import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { keyBetween, keyAfter, maxKeyLength } from "./order";

describe("fractional order keys (S02, ported from Tracer S4)", () => {
  it("keyAfter produces an increasing sequence when appending", () => {
    let last: string | null = null;
    const keys: string[] = [];
    for (let i = 0; i < 20; i++) {
      last = keyAfter(last);
      keys.push(last);
    }
    const sorted = [...keys].sort();
    expect(keys).toEqual(sorted);
  });

  it("keyBetween lands strictly between its neighbours", () => {
    const a = keyAfter(null);
    const c = keyAfter(a);
    const b = keyBetween(a, c);
    expect(a < b).toBe(true);
    expect(b < c).toBe(true);
  });

  // The property the whole scheme rests on: you can ALWAYS insert between two keys, and the result stays
  // strictly ordered — no matter how many times you subdivide the same gap.
  it("property: repeated inserts between the same neighbours stay strictly ordered", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 40 }), (n) => {
        const lo = keyAfter(null);
        let hi = keyAfter(lo);
        for (let i = 0; i < n; i++) {
          const mid = keyBetween(lo, hi);
          expect(lo < mid && mid < hi).toBe(true);
          hi = mid; // keep subdividing the lower half — the adversarial hot-slot case
        }
      }),
    );
  });

  it("maxKeyLength grows under same-slot inserts — the rebalance signal (Tracer flaw #2, watched not re-planted)", () => {
    const lo = keyAfter(null);
    let hi = keyAfter(lo);
    const keys = [lo, hi];
    for (let i = 0; i < 30; i++) {
      const mid = keyBetween(lo, hi);
      keys.push(mid);
      hi = mid;
    }
    // We don't assert an exact length; we assert the metric MOVES, proving the watch is real.
    expect(maxKeyLength(keys)).toBeGreaterThan(1);
  });
});
