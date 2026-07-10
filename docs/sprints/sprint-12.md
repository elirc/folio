# Sprint 12 — Performance: Large Docs & Many Cursors

**Branch:** `sprint-12/performance` · **Size:** L · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** Make it fast under real load: 10,000-block documents, 50 concurrent cursors, and the editor still hitting the S4 latency budget. Audit-first: measure, then virtualize rendering, batch updates and awareness, and lazy-load. The budget becomes a CI gate. Mostly `[L]` with AI review — the learner has done a perf sprint before (Tracer S12).

## A — Issues
1. `Perf audit vs latency-budget.md at 10k blocks / 50 cursors (findings first)`
2. `Virtualized block rendering (render visible blocks only, ProseMirror-compatible)`
3. `Update + awareness batching (many cursors, rapid edits)`
4. `Lazy loading (large docs, embedded media) + budget CI gate`

## B — Commits
| # | Commit | Notes |
|---|--------|------|
| 1 | `[L] feat: 10k-block doc generator + 50-cursor simulation harness` | the measuring stick (🔗 the learner builds load tools reflexively now) |
| 2 | `[A] docs: perf audit — findings vs budget, ranked` | AI writes the ranked audit (the methodology, one more time); findings: render cost at 10k blocks, awareness storm at 50 cursors |
| 3 | `[L] perf(editor): virtualized block rendering — visible + overscan, ProseMirror decoration-safe` | ⚠️ virtualizing a ProseMirror doc is subtle (selection, find, scroll-to must work with unrendered blocks); the hard part, AI-reviewed |
| 4 | `[L] perf(sync): awareness batching — coalesce cursor updates to one frame` | **[in-PR arc]** 50 cursors moving = a render storm; batch to rAF |
| 5 | `[L] perf(sync): update batching — debounce local update broadcast to a flush window` | 🔗 Tracer S12's flush-window lesson, CRDT-shaped; balance latency vs message volume |
| 6 | `[L] perf(web): lazy-load embedded media + below-fold blocks; skeleton states` | |
| 7 | `[L] perf(editor): re-render audit — memo boundaries so one block's edit doesn't re-render 10k` | React profiler evidence (🔗 Tracer S12) |
| 8 | `[A] ci: latency-budget gate — editor interaction perf spec asserts <16ms/keystroke, palette/scroll budgets` | budget regressions fail CI |
| 9 | `[L] test: perf specs; virtualization correctness (selection/scroll with unrendered blocks)` | |
| 10 | `[A] docs: curriculum note — the perf audit checklist` | |

## C — Review order
Audit (2) → virtualization + its correctness caveats (3) → awareness/update batching (4–5) → the CI gate (8).

## D — Teaching comments (~9)
- audit-first — 🔗 the learner runs the methodology themselves now (measure → rank → fix-one-per-commit → prove); the AI review checks the *rigor*, not teaches the method
- virtualizing ProseMirror — ⚠️ the genuinely hard one: PM assumes a full document DOM; virtualization must preserve selection mapping, find-in-page, scroll-to-block, and collaborative cursors pointing at unrendered blocks; decorations for offscreen cursors — this is where the review spends its attention
- awareness batching — 📘 50 cursors × pointer-move frequency = a message and render storm; coalesce to one rAF; 🔗 Tracer S12 (unbatched presence was flaw #5 there — the learner should preempt it here, and the review checks they did)
- update flush window — 📘 the latency/throughput knob again; a per-keystroke broadcast floods; batching to ~1 frame is nearly invisible and hugely cheaper
- memo boundaries — 🔗 Tracer S12: memo where the profiler says; one block's edit re-rendering the whole doc is the default React trap
- budget as CI gate — 🔗 the budget written in S4 becomes enforced here; the whole arc (instrument S4 → enforce S12) mirrors Tracer exactly — cross-course structural rhyme

## E — Debate
**"Virtualize the editor vs cap document size vs paginate?"** Cap: dodges the problem, limits the product. Paginate: changes the UX (docs aren't pages). Virtualize: keeps the infinite-scroll feel, hard to implement correctly. **Resolution:** virtualize, accepting the complexity, because a document editor that caps size or paginates isn't competitive; the ADR documents the correctness obligations (selection, search, cursors). Lesson: *sometimes the hard implementation is the only one that preserves the product — and you pay for it with a rigorous correctness test suite.*

## F/G — Close
- Squash: `perf(sprint-12): virtualization, batching, budget enforcement (closes #…)`
- Deferred: incremental snapshot loading, worker-thread CRDT for huge docs.
- Recap idea: *a fast collaborative editor is virtualized rendering plus batched updates plus a budget CI won't let you regress.*
