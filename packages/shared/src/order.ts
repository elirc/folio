// Fractional indexing for sibling order in the document tree (ADR-0003).
//
// [L] PORTED from Tracer S4 (packages/shared/src/order.ts, `keyBetween`). A node's position among its
// siblings is a base-62 string key; to move a node we compute a key strictly BETWEEN its new neighbours —
// one row updates, the siblings don't resequence, and it stays merge-friendly for when tree ops go through
// the sync engine later. The alphabet is ascending-ASCII so plain string `<` gives the right order.
//
// ⚠️ CARRY THE LESSON, NOT JUST THE CODE. In Tracer this function had a known flaw (#2): repeated inserts
// between the SAME two neighbours grow the key without bound, and rebalancing was the harvest in Tracer
// S12. We are porting the generator but NOT re-planting the flaw silently: `maxKeyLength` is here so the
// tree can be watched, and rebalancing is a named follow-up (deferred; our trees are shallow and inserts
// are spread across many sibling sets, so key growth is far slower than an issue list's single hot column).
const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const BASE = DIGITS.length; // 62

function idx(ch: string): number {
  return DIGITS.indexOf(ch);
}

/**
 * A key strictly between `a` and `b` (either may be null for "before first" / "after last").
 * Requires a < b when both are given.
 */
export function keyBetween(a: string | null, b: string | null): string {
  const lo = a ?? "";
  const hi = b ?? "";
  let out = "";
  let i = 0;
  for (;;) {
    const x = i < lo.length ? idx(lo[i]!) : 0;
    const y = i < hi.length ? idx(hi[i]!) : BASE;
    if (x === y) {
      out += DIGITS[x];
      i++;
      continue;
    }
    const mid = Math.floor((x + y) / 2);
    if (mid === x) {
      out += DIGITS[x];
      i++;
      continue;
    }
    return out + DIGITS[mid];
  }
}

/** The key for a new node appended after `last` (or first if last is null). */
export function keyAfter(last: string | null): string {
  return keyBetween(last, null);
}

/** The longest key in a sibling set — the metric that says "time to rebalance" if it ever creeps up. */
export function maxKeyLength(keys: string[]): number {
  return keys.reduce((m, k) => Math.max(m, k.length), 0);
}
