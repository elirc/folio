# ADR-0009 — Offline-first persistence & merge

**Status:** accepted (S08) · **Builds on:** ADR-0008 (Yjs) · **Relates to:** flaw #2 harvest (identity in the CRDT)

## Context

A CRDT's headline promise is offline editing that merges cleanly. S08 makes it real: boot from disk, edit
with no connection, reconnect, converge — with **no clobber and no merge dialog**.

## Decisions

### 1. IndexedDB persistence, booted BEFORE the network
The Y.Doc loads from IndexedDB first; the editor is usable instantly, even offline. Only then does the
provider attempt to sync with the server. 🔗 The boot-from-disk-before-network ordering is the learner's
Tracer S7 offline-first muscle — and it's the *right* ordering: never block editing on a connection.

### 2. Reconnect sends the DIFF, not a full resend
While offline, edits accumulate in the Y.Doc. On reconnect, the sync handshake sends **only the delta the
peer lacks**, computed from its state vector (the S07 SV exchange). The naive first cut — resend the entire
local state every reconnect — works but re-sends everything the peer already has.
*Lesson (recurring capstone review note): **use the tool you adopted.** Yjs already solved efficient
reconnect; a full-resend re-derives a problem that's already gone.*

### 3. No merge-conflict UI — because there are no conflicts
The CRDT already merged. We show offline status + a non-blocking "merged while you were away" affordance —
a *view*, not a *resolve*. Bolting a git-style conflict dialog onto a conflict-free system would be theater.
*Lesson: surface what changed; don't ask users to resolve what already merged.*

## The duplicate-block lesson (in-PR arc — the subtle one)

The learner's first offline block-create produced **duplicate blocks** after merge. The instinct is to blame
the merge and add dedupe logic. **That instinct is wrong.**

**A proper CRDT makes merge conflicts impossible *within the model*.** So a post-merge duplicate means the
bug lives in logic *outside* the CRDT — here, block identity generated app-side (the S03 `Math.random`
scheme, or a deterministic id) and then deduped by hand. Two offline clients minted "the same" id, and the
dedupe either dropped a real edit or created a phantom.

**The fix is not more dedupe — it's to push identity INTO the CRDT** (exactly what S07's flaw-#2 harvest
did). With Yjs owning identity:
- Two clients creating *different* blocks offline → two **distinct** blocks, both survive (correct).
- Two clients editing the *same* block offline → one block with both edits (correct).

There is nothing to dedupe because the model never conflated them. 🔗 This is *why* S07 moved block ids into
Yjs. `duplicateBlock.test.ts` proves both cases.

## Consequences

- Offline edits persist across reloads (IndexedDB) and merge on reconnect via the SV diff.
- The offline-merge fuzzer extends S06's convergence property to **partitions** (offline periods), not just
  concurrent ops — and it stays in the sacred convergence gate.
- Deferred: offline *media* upload queue; selective sync for very large workspaces.

*Lesson (the sprint in one line): offline-first on a CRDT makes the scary part — merge — free. The remaining
bugs live in the code you wrote around the CRDT, not in the merge itself.*
