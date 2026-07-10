# ADR-0013 — Performance: virtualization, batching & the budget gate

**Status:** accepted (S12) · **Enforces:** the S04 latency budget (ADR-0005 era) + flaw #4's load-time bound

## Context

Folio must stay fast at real scale: 10k-block documents, 50 concurrent cursors, still under the S04 budget
(≤16ms/keystroke). We measured first (`perf-audit.md`), ranked findings by user impact, and fixed causes one
per commit.

## Decisions

### 1. Virtualize rendering (don't cap or paginate)
Render only the visible blocks + overscan; the range math is a pure, tested function (`visibleRange`), the
DOM integration lives in the web app. ⚠️ Virtualizing a ProseMirror document is *subtle* — selection
mapping, find-in-page, scroll-to-block, and collaborative cursors pointing at UNRENDERED blocks must all keep
working. We accept that complexity (see the debate) and pay for it with a correctness test suite around the
range math.

### 2. Coalesce awareness to one frame
50 cursors moving = 50 messages + 50 renders per frame. A `Batcher` collects changes and flushes ONCE per
animation frame. 🔗 Tracer S12's flush-window lesson — and Tracer had unbatched presence as a *flaw*; here
the learner preempts it.

### 3. Update flush window
Coalesce local update broadcasts to ~one frame instead of one-per-keystroke. The latency/throughput knob
again: ~16ms coalescing is nearly invisible and hugely cheaper on the wire.

### 4. Memo boundaries + lazy-load
Memoize so one block's edit doesn't re-render 10k; lazy-load below-fold media with skeletons.

### 5. The budget becomes a CI gate
`perf:budget` runs in CI. The **robust** assertion is structural: a keystroke on a 10k-block doc emits an
**O(edit)** update, not O(document) — that's *why* the budget holds at scale, and it's the harvest of flaw
#4's degradation at the edit layer. A generous wall-clock smoke check rides on top (kept loose so CI noise
can't flap it). Instrument in S04 → enforce in S12: the exact Tracer arc.

## The debate — virtualize vs cap size vs paginate

- **Cap document size:** dodges the problem, limits the product (users hit a wall).
- **Paginate:** changes the UX — documents aren't pages; infinite scroll is the expectation.
- **Virtualize (chosen):** keeps the infinite-scroll feel; hard to implement correctly.

**Chosen: virtualize.** A document editor that caps size or paginates isn't competitive. We accept the
implementation complexity because it's the only option that *preserves the product*, and we discharge the
risk with a rigorous correctness suite (selection/scroll/cursors with unrendered blocks).

*Lesson: sometimes the hard implementation is the only one that preserves the product — and you pay for it
with a rigorous correctness test suite, not by dodging into a lesser UX.*

## Consequences

- Keystroke cost is bounded at scale (structural + smoke-tested); the budget is CI-enforced.
- Awareness + updates are frame-batched; rendering is virtualized + memoized.
- Deferred: incremental snapshot loading, worker-thread CRDT for huge docs.
