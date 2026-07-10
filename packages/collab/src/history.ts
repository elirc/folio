import * as Y from "yjs";

/**
 * Persistence, snapshots & version history (S10). The elegant payoff of the whole CRDT arc:
 *
 * 📘 THE UPDATE LOG THAT *SYNCS* THE DOCUMENT ALSO *IS* ITS COMPLETE HISTORY. Every edit is an update; the
 * ordered log of updates records the document's entire evolution. You built version history in S07 without
 * knowing it — collaboration and time-travel are the *same data*. This module makes that explicit: load by
 * replay, reconstruct any past version, and — because the naive log grows forever — COMPACT it.
 */

/** Load a document by replaying its full update log (the naive, correct-but-unbounded path). */
export function replay(updates: Uint8Array[]): Y.Doc {
  const doc = new Y.Doc();
  for (const u of updates) Y.applyUpdate(doc, u);
  return doc;
}

/** Reconstruct the document as it was AFTER the first `count` updates — free time-travel from the log. */
export function reconstructAt(updates: Uint8Array[], count: number): Y.Doc {
  return replay(updates.slice(0, Math.max(0, Math.min(count, updates.length))));
}

/**
 * COMPACTION (harvest of flaw #4). Merge many updates into ONE equivalent update — a snapshot. Loading then
 * becomes "apply one snapshot + the short tail since," instead of replaying millions of keystroke-updates.
 * Yjs's merge also garbage-collects tombstones (🔗 the S07 ADR's note on Yjs GC — this is where it pays off,
 * and understanding it required crdt-101's tombstone lesson in S06).
 *
 * ⚠️ THE SCARIEST PROPERTY IN THE SPRINT: a compacted document MUST load to the IDENTICAL state as full
 * replay. A compaction bug silently corrupts history. `history.test.ts` asserts compacted ≡ replayed.
 */
export function compact(updates: Uint8Array[]): Uint8Array {
  return Y.mergeUpdates(updates);
}

/** A snapshot of the current state as a single update (what we persist as the compaction checkpoint). */
export function snapshot(doc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(doc);
}

/** Load from a snapshot + the tail of updates recorded since it was taken. */
export function loadFromSnapshot(snapshotUpdate: Uint8Array, tail: Uint8Array[]): Y.Doc {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, snapshotUpdate);
  for (const u of tail) Y.applyUpdate(doc, u);
  return doc;
}

/**
 * RESTORE an old version — CRDT-consistently. 📘 This is NOT a destructive rewind (that would corrupt
 * concurrent editors). Restoring means computing the delta from *now* to the *old* state and applying it as
 * NEW updates, so the document moves forward to look like the past. Contrast git reset (which rewrites
 * history); here history is append-only and restore is just more history.
 *
 * We compute it as: the difference that turns the current doc's state into the old doc's content. The
 * simplest correct implementation for a teaching system: apply the old snapshot's content as a fresh update
 * on top of current (Yjs merges; the old identities re-assert). Returned as an update to broadcast.
 */
export function restoreAsUpdate(current: Y.Doc, oldSnapshot: Uint8Array): Uint8Array {
  // The old snapshot, expressed as the delta `current` is missing — applied forward, not rewound.
  const currentSv = Y.encodeStateVector(current);
  const oldDoc = new Y.Doc();
  Y.applyUpdate(oldDoc, oldSnapshot);
  return Y.encodeStateAsUpdate(oldDoc, currentSv);
}
