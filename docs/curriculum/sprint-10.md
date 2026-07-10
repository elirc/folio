# Curriculum Note — Sprint 10: Persistence, Snapshots & Version History

## Learning objectives
- See that the CRDT **update log IS the version history** — collaboration and time-travel are one dataset.
- Harvest flaw #4: bound the unbounded log with **compaction**, and prove it can't corrupt state.
- Understand **restore as append**, not a destructive rewind — CRDT-consistent time travel.

## Key concepts
- **The log is the history (the elegant payoff).** Every edit is an update; the ordered log records the whole
  evolution. `reconstructAt(log, k)` replays the first k updates to get any past version. 📘 You built version
  history in S07 without knowing it — the same log that syncs edits records their sequence.
- **🔗 Flaw #4: unbounded log.** Every keystroke is an update; a year-old doc has millions; load-by-full-
  replay degrades linearly. **Compaction** (`Y.mergeUpdates` → one snapshot) bounds it, and Yjs's merge GCs
  tombstones (understanding *that* required crdt-101's tombstone lesson). 🔗 The same "append-only needs
  compaction" lesson as analytics rollups, editor-shaped.
- **⚠️ Compaction correctness is the scariest property.** A compacted document MUST load to the *identical*
  state as full replay — a compaction bug silently corrupts history, and corrupt history is undetectable
  until someone needs it. `history.test.ts` asserts **compacted ≡ replayed** across 150 randomized edit
  sequences. Non-negotiable.
- **📘 Restore is append, not rewind.** Restoring an old version doesn't rewind the log (that would corrupt
  concurrent editors). It computes the delta from *now* to the *old* state and applies it as a NEW update —
  the doc moves *forward* to look like the past. Contrast `git reset`. A restore *converges* two peers, it
  doesn't diverge them.
- **Snapshot cadence tracks the load-time budget.** Hybrid: threshold-on-log-size OR explicit save-version.
  Tie cadence to the user-facing metric (load time, S12), not a magic count.

## Ledger — flaw #4 harvested (mechanism)
Compaction bounds the log here; the *continuous* load-time budget gate lands in S12. The correctness property
(compacted ≡ replayed) guards it forever.

## The debate, cashed
**Snapshot cadence: every N updates vs time-based vs size-based?** Resolved: hybrid (size threshold OR
explicit save), tied to the load-time budget. *Compaction cadence is a load-time-vs-storage tradeoff — tie
it to the user-facing metric, not an arbitrary count.*

## Exercise questions
1. Explain, in one sentence each, why the sync log and the version history are the same data.
2. Why is "compacted ≡ replayed" the one property you cannot skip when touching persistence? What does a
   violation look like to a user, and *when* would they discover it?
3. Restore an old version while a colleague is editing. Trace why append-forward converges but rewind would
   diverge. What CRDT property makes the difference?
4. Yjs GCs tombstones during compaction. Why couldn't it do that during live editing? (Hint: crdt-101 — a
   concurrent op might still reference the tombstone.)

## Further reading
- Yjs `mergeUpdates`, snapshots, and GC · "Event sourcing + snapshots" · log compaction (Kafka/analytics
  rollups) · ADR-0011 (this decision)
