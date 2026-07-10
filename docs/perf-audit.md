# Performance Audit (S12) — 10k blocks / 50 cursors vs the budget

**Method: measure → rank → fix one per commit → prove.** 🔗 The learner runs the methodology now; this
document is the *findings first*, before any fix.

## Setup
- Document: **10,000 blocks** (`bigDoc(10_000)`), realistic body text per block.
- Presence: **50 concurrent cursors** moving at pointer-move frequency (`simulateCursors(50, …)`).
- Budget: `latency-budget.md` — **≤16ms/keystroke**, slash ≤50ms, drag frame ≤16ms, cold open ≤200ms.

## Findings, ranked by user impact

| # | Finding | Cause | Fix (this sprint) |
|---|---------|-------|-------------------|
| 1 | **Render cost at 10k blocks** — every keystroke re-renders the whole document DOM | ProseMirror renders all blocks; React re-renders the tree | **Virtualize** (render visible + overscan) + **memo boundaries** |
| 2 | **Awareness storm at 50 cursors** — 50 × pointer-move ⇒ 50 messages + 50 renders per frame | one awareness message per cursor move | **Batch awareness to one rAF flush** |
| 3 | **Update flood on fast typing** — a network message per keystroke | per-keystroke broadcast | **Update flush window** (coalesce local updates) |
| 4 | **Cold open of a heavily-edited doc** — linear in edit count | full update-log replay | **Snapshot + compaction** (S10 mechanism; enforced by this budget) |
| 5 | **Media blocks block first paint** | eager image load | **Lazy-load** below-fold media + skeletons |

## The structural guarantee (why the budget holds at scale)

The deepest fix isn't a micro-optimization — it's that **a keystroke emits an O(edit) update, not an
O(document) one.** On a 10k-block doc, typing one character produces a ~tens-of-bytes Yjs update, independent
of document size. Had we kept S05's whole-doc model, the budget would be *impossible* at scale — every
keystroke would serialize the entire document. The CRDT's incremental updates are what make a large-document
budget achievable at all. `budget.perf.test.ts` asserts this structurally (update size bounded) plus a
generous wall-clock smoke check.

## What became a CI gate

`perf:budget` now runs in CI. A change that makes a keystroke O(document) again — or blows the wall-clock
smoke budget — **fails the build.** Instrument in S04, enforce in S12: the budget is no longer a document,
it's a gate.

*Lesson: performance is measured, ranked, and fixed one cause at a time — and the budget you wrote before you
could violate it becomes the CI check that won't let you regress.*
