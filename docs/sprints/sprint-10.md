# Sprint 10 — Persistence, Snapshots & Version History

**Branch:** `sprint-10/persistence-history` · **Size:** L · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** Make the document durable and time-travelable: an update-log persistence model with periodic snapshots and compaction (harvesting the unbounded-log flaw), named/auto version snapshots, and a history browser that reconstructs any past state. The CRDT's update log is both the sync mechanism and the history — a two-for-one the learner now appreciates.

## A — Issues
1. `Persistence model: append Yjs updates, periodic snapshots, load = snapshot + tail`
2. `Compaction: collapse old updates into snapshots (harvest flaw #4 — unbounded log)`
3. `Version history: named versions + auto-checkpoints; restore/branch`
4. `Time-travel viewer: reconstruct and preview any past version`

## B — Commits
| # | Commit | Notes |
|---|--------|------|
| 1 | `[L] feat(db): update-log persistence — append updates, load by replaying from a snapshot` | the learner formalizes S7's storage; document load = latest snapshot + updates since |
| 2 | `[A] test: load time vs edit count — degrades linearly (documents flaw #4)` | AI writes the measurement that exposes the unbounded log; a heavily-edited doc loads slowly |
| 3 | `[L] feat(worker): compaction — periodically snapshot the Y.Doc, GC applied updates` | **harvests flaw #4**, ledger quoted; load-time before/after graph; Yjs's own GC of tombstones referenced (🔗 the S7 ADR mentioned Yjs GC — here's why it matters) |
| 4 | `[L] feat(db): VersionSnapshot — named (user "save version") + automatic (periodic) checkpoints` | |
| 5 | `[L] feat(api): reconstruct any version — snapshot + replay to a point; diff between versions` | history is *free* from the update log — the same log that syncs edits records their sequence |
| 6 | `[L] feat(web): version history panel — timeline, preview, restore, "restore as branch"` | restore = apply the old state as new updates (not a destructive rewind — CRDT-consistent) |
| 7 | `[L] feat(editor): version diff view — what changed between two checkpoints (per-block)` | |
| 8 | `[L] test: compaction correctness (compacted load ≡ full-replay load); version restore convergence` | ⚠️ compaction must never change the resulting state — a property test |
| 9 | `[A] docs: ADR-0010 persistence + compaction; curriculum note` | |

## C — Review order
The persistence model (1) → the flaw measurement (2) → compaction + its correctness test (3, 8) → version reconstruction (5).

## D — Teaching comments (~9)
- log-is-history — 📘 the elegant payoff: the update log that *syncs* the document also *is* its complete history; you built version history in S7 without knowing it — collaboration and time-travel are the same data
- unbounded log — 🔗 flaw #4: every keystroke is an update; a year-old doc has millions; load-by-full-replay degrades linearly; compaction (snapshot + GC) bounds it — 🔗 the same "append-only needs compaction" lesson as Pulse's rollups, editor-shaped
- compaction correctness — ⚠️ the scariest property: a compacted document must load to the *identical* state as full replay; a compaction bug silently corrupts history; the property test (compacted ≡ replayed) is non-negotiable
- restore-as-updates — 📘 restoring an old version isn't a destructive rewind (that would break concurrent editors); it's applying the old state as *new* updates — CRDT-consistent time travel; contrast git reset
- Yjs GC — 🔗 the S7 ADR noted Yjs garbage-collects tombstones; compaction is where that pays off; understanding it required crdt-101's tombstone lesson (S6)
- diff view — 📘 per-block diff over structured content is harder than line diff; anchor to block identity (the S9 anchoring lesson generalizes)

## E — Debate
**"Snapshot cadence: every N updates vs time-based vs size-based?"** N-updates: predictable, ignores edit velocity. Time: simple, wasteful for idle docs. Size: bounds load time directly. **Resolution:** hybrid — snapshot when update-log size since last snapshot crosses a threshold *or* on explicit save-version, whichever first; the ADR ties cadence to the load-time budget (S12). Lesson: *compaction cadence is a load-time-vs-storage tradeoff; tie it to the user-facing metric (load time), not an arbitrary count.*

## F/G — Close
- Squash: `feat(sprint-10): persistence, snapshots, version history (closes #…)`
- Deferred: named-branch merging, per-block history, export-a-version.
- Ledger: flaw #4 closed.
- Recap idea: *the sync log is the history — collaboration and time-travel were the same feature all along, you just had to bound its growth.*
