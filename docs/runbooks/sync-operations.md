# Runbooks — Operating the Folio Sync Layer (S15)

Concise, actionable playbooks for the on-call engineer. The sync layer is *stateful* (live docs + open
sockets), so these focus on document health, not just process health.

## 1. High sync lag
**Symptom:** sync-lag histogram p95 above SLO; users report laggy typing for collaborators.
**Check:** update rate per doc (a hot doc with many editors); server CPU; Redis fanout latency (multi-instance).
**Act:** confirm the keystroke is still O(edit) (perf:budget gate); if a doc is pathologically hot, check for
a runaway client (an automation spamming updates) and rate-limit that socket. Escalate if p95 stays high after
load sheds.

## 2. Convergence divergence alert
**Symptom:** `DivergenceAlerter` fired `diverged` (not `suspect`).
**Meaning:** ⚠️ this should be IMPOSSIBLE — it's a real bug, not routine. Two instances hold irreconcilable
state for one doc.
**Act:** capture both instances' state vectors + the doc's update log. Do NOT "pick a winner" (that's S05's
sin). Force a full bidirectional exchange; if it reconciles, it was a delayed-propagation false alarm (tune
the threshold, §8 of the drill). If it does NOT reconcile, you have a genuine convergence violation — freeze
writes to that doc, snapshot both states for forensics, and page the sync owner. This is a P1.

## 3. Split-brain recovery (network partition healed)
**Symptom:** instances were partitioned; both took edits.
**Act:** on heal, the instances exchange update logs automatically and converge (the CRDT's guarantee — see
`splitbrain.convergence.test.ts`). Verify convergence health returns `healthy` for affected docs. **No manual
merge or edit-discarding is ever needed** — both halves' edits survive by construction. If health does not
clear, escalate to §2.

## 4. Update-log restore
**Symptom:** a doc is corrupted or lost; restore from backup needed.
**Act:** `restoreDoc(backup)` (refuses a checksum mismatch loudly). ⚠️ Clients with newer state must re-sync
FORWARD (`resyncAfterRestore`), never be rewound — restoring a collaborative doc keeps clients' post-backup
edits. Verify convergence health after restore.

## 5. Stuck document
**Symptom:** a doc won't load or a client can't sync.
**Act:** check the doc's persisted `yUpdate` decodes (`safeApplyUpdate` on a scratch doc). If malformed,
restore from the last good backup (§4). Evict the room (drain that doc) so clients reconnect fresh.

## 6. Rolling deploy (graceful drain)
**Act:** call `YRooms.drain()` on the draining instance — it persists every active doc's final state and
evicts sockets with code 4001; clients reconnect to the new instance and re-sync seamlessly (S07/S08
machinery). Watch `activeDocCount` fall to 0 before terminating. Never SIGKILL an instance with live docs
before draining — that risks the last few unpersisted updates.

## 7. Rollback
**Act:** deploys are drain-safe both ways; roll back the same way (drain new, route to old). The update log +
snapshots make the document state deploy-version-independent.
