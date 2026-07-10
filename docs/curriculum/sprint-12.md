# Curriculum Note — Sprint 12: Performance (Large Docs & Many Cursors)

## Learning objectives
- Run the perf methodology yourself: **measure → rank → fix one cause per commit → prove.**
- See why the CRDT's incremental updates make a large-document budget *possible at all*.
- Turn the S04 budget into an enforced **CI gate** — instrument early, enforce late.

## Key concepts
- **Audit-first.** Measure at real scale (10k blocks, 50 cursors) *before* fixing; rank findings by user
  impact. 🔗 You've done a perf sprint before (Tracer S12) — the review checks your *rigor*, not the method.
- **The structural guarantee.** The deepest reason the budget holds isn't a micro-opt — it's that a keystroke
  emits an **O(edit)** update, not **O(document)**. Type one char in a 10k-block doc → a tens-of-bytes Yjs
  update, independent of size. Had we kept S05's whole-doc model, the budget would be *impossible* at scale.
  The CRDT you built is what makes large-doc performance achievable. `budget.perf.test.ts` asserts this
  structurally.
- **Virtualize, don't cap or paginate.** Render visible blocks + overscan. ⚠️ Virtualizing ProseMirror is
  subtle — selection, find-in-page, scroll-to-block, and cursors on *unrendered* blocks must all still work.
  The range math (`visibleRange`) is pure + tested; the DOM wiring is where the review spends its attention.
- **Coalesce to one frame.** 50 cursors × pointer-move = a storm; a `Batcher` flushes once per rAF. 🔗 Tracer
  S12 had unbatched presence as a *flaw* — here you preempt it. Same knob for update broadcast (flush window).
- **Memo boundaries.** Memoize so one block's edit doesn't re-render 10k — the default React trap; memo where
  the profiler says, not everywhere.
- **The budget is now a gate.** `perf:budget` runs in CI; a regression to O(document) keystrokes fails the
  build. 🔗 Instrument in S04 → enforce in S12 — the exact Tracer arc, a cross-course structural rhyme.

## The debate, cashed
**Virtualize vs cap size vs paginate?** Resolved: virtualize, accepting the complexity, because capping or
paginating isn't a competitive document editor. *Sometimes the hard implementation is the only one that
preserves the product — and you pay for it with a rigorous correctness test suite.*

## Exercise questions
1. Why is "a keystroke emits an O(edit) update" the real guarantee behind the budget? What would S05's model
   have made it?
2. Name the four things that must keep working when you virtualize a ProseMirror document. Which is hardest?
3. Compute the message rate of 50 cursors at 60Hz pointer moves, unbatched vs batched-to-rAF. What's the ratio?
4. Why enforce the budget as a *structural* assertion (update size) rather than only a wall-clock timing?
   (Hint: CI noise.)

## Further reading
- react-window / virtualization patterns · ProseMirror large-doc performance notes · RAIL model / frame
  budgets · `perf-audit.md`, ADR-0013
