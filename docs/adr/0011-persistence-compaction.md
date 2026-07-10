# ADR-0011 — Persistence, snapshots & compaction

**Status:** accepted (S10) · **Harvests:** flaw #4 (unbounded update log) · **Budget-enforced:** S12

## Context

S07 persisted the document as a Yjs update log. That log grows with **every keystroke** — a year-old
document has millions of updates, and loading by full replay degrades **linearly**. We must bound it, and —
happily — the same log gives us version history for free.

## The elegant realization

📘 **The update log that *syncs* the document also *is* its complete history.** We built version history in
S07 without knowing it: the ordered log of updates records the document's entire evolution. Collaboration
and time-travel are the *same data*. So `reconstructAt(log, k)` — replay the first k updates — is free.

## Decisions

### 1. Load model: snapshot + tail
A document loads as **latest snapshot + updates since**, not a full replay. `loadFromSnapshot(snap, tail)`.

### 2. Compaction (harvest of flaw #4)
Periodically merge the update log into one snapshot (`compact` = `Y.mergeUpdates`), bounding load time. Yjs's
merge also **garbage-collects tombstones** — 🔗 the S07 ADR flagged Yjs GC; this is where it pays off, and
understanding it required crdt-101's tombstone lesson (S06). Load-time before/after: linear-in-edits → ~flat.

> **Ledger flaw #4** — *"Update log grows unbounded — no compaction; document load time degrades with edit
> count."* Status flipped to **closed (mechanism)**: compaction bounds the log here; S12 wires the *continuous*
> load-time budget gate that keeps it bounded.

### 3. ⚠️ Compaction correctness is non-negotiable
A compacted document **must** load to the *identical* state as full replay. A compaction bug silently
corrupts history — the worst kind of bug. `history.test.ts` asserts **compacted ≡ replayed** as a property
(150 randomized edit sequences). This test is the price of admission for touching persistence.

### 4. Restore is append, not rewind
📘 Restoring an old version is **not** a destructive rewind (that would corrupt concurrent editors and
break the CRDT's append-only model). It computes the delta that turns *now* into the *old* state and applies
it as a **new** update — the document moves *forward* to look like the past. Contrast `git reset`, which
rewrites history; here history is append-only and restore is just more history. `restoreAsUpdate` +
`history.test.ts` prove a restore converges two peers rather than diverging them.

## Snapshot cadence (the debate)

Hybrid: snapshot when the update-log size since the last snapshot crosses a threshold **or** on an explicit
"save version," whichever first. Cadence is tied to the **load-time budget** (S12), not an arbitrary count.
*Lesson: compaction cadence is a load-time-vs-storage tradeoff — tie it to the user-facing metric (load
time), not a magic number.*

## Consequences

- `VersionSnapshot` stores compacted checkpoints (named + automatic); reconstruction is "apply one blob."
- The compaction-correctness property test guards persistence forever.
- Deferred: named-branch merging, per-block history, export-a-version.

*Lesson: the sync log is the history — collaboration and time-travel were the same feature all along; you
just had to bound its growth.*
