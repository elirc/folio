# Sprint 08 — Offline-First & Merge (Dialogue)

**Branch:** `sprint-08/offline-merge` · **Size:** L · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** Edit offline, reconnect, and merge cleanly — the CRDT's headline promise made real. IndexedDB persistence, offline edit queuing, and reconnection merge with no clobbering. Dialogue format: **the learner authors the offline layer**; the AI reviews. By now the learner has built offline-first before (Tracer S7) — this is that muscle plus CRDTs.

## A — Issues
1. `IndexedDB persistence of the Y.Doc (y-indexeddb or custom)`
2. `Offline editing: edits apply locally, queue as Yjs updates, sync on reconnect`
3. `Reconnection merge: local + remote updates converge (no lost work)`
4. `Offline UX: status, pending indicator, conflict-free by construction`

## B — Commits (J = learner, S = AI review)
| # | Commit | Notes |
|---|--------|------|
| 1 | `[L/J] feat(sync): IndexedDB persistence — boot Y.Doc from disk before network` | 🔗 the learner ports their Tracer S7 offline-first instincts; boot-from-disk is familiar |
| 2 | `[L/J] feat(sync): offline edit queue — [J] naive, re-sends full local state on reconnect` | works but wasteful; a full-state resend on every reconnect doesn't scale |
| 3 | `[S] refactor(sync): reconnect sends only the diff (state-vector based)` | AI review: Yjs already gives you efficient diffs (the SV exchange from S7) — use it; body reviews J's full-resend |
| 4 | `[L/J] feat(editor): offline block creation — [in-PR arc] two offline clients create a block, reconnect → duplicate blocks, FAILS` | **[in-PR arc]** the learner's offline block-create duplicates |
| 5 | `[S] fix(editor): rely on CRDT identity for blocks — no dedupe needed, the model prevents it` | the lesson: with a *proper* CRDT, this class of merge bug shouldn't exist — the duplicate came from block-creation logic *outside* the CRDT; move identity into Yjs and the problem dissolves |
| 6 | `[L] feat(web): offline status UI, pending-sync indicator, "back online — merged" affordance` | |
| 7 | `[L] test(fuzz): offline-merge convergence — partition N clients, edit offline, heal, assert convergence` | the fuzzer extended to model offline partitions |
| 8 | `[L] test(e2e): two-context offline editing → reconnect → both sets of edits present, none lost` | the S5 nightmare, now impossible |
| 9 | `[A] docs: ADR-0008 offline persistence model; curriculum note (learner retro)` | |

## C — Review order
J's full-resend (2) → S's diff-based fix (3) → **the duplicate-block arc (4→5): the bug was outside the CRDT** → offline-merge fuzz (7).

## D — Teaching comments (~9, review-feedback-heavy)
- boot-from-disk — 🔗 review-lens: the learner's Tracer S7 muscle memory; the AI review checks the ordering (disk before network) is right — it is, they learned it
- full-resend → diff — 📘 the SV-exchange from S7 means reconnect is already efficient; J's full-resend re-derives a problem Yjs solved; *use the tool you adopted* — a recurring capstone review note
- the duplicate-block lesson — ⚠️ the most subtle teaching moment: a proper CRDT makes merge conflicts impossible *within the model*, so when you see a duplicate, the bug is in logic that lives *outside* the CRDT (block ids generated app-side vs Yjs-side); the fix is to push identity *into* the CRDT — 🔗 this is why S7 moved ids to Yjs
- offline-merge fuzz — 🔍 review-lens: the fuzzer must model *partitions* (offline periods), not just concurrent ops; the learner extends their own fuzzer to do this
- conflict-free-by-construction — 📘 the offline UX has no merge-conflict dialog because there are no merge conflicts — the CRDT's entire value proposition; contrast git's merge conflicts, and why documents chose a different model

## E — Debate
**"Offline conflict UX: show a merge review vs silent convergence?"** Merge review (git-style): user control, but there are no *conflicts* to review — the CRDT already merged; showing a fake conflict dialog would be theater. Silent: honest to the model, but users may want to see what changed while away. **Resolution:** silent convergence + a non-blocking "changes merged while you were offline" summary (view, not resolve). Lesson: *don't bolt a conflict-resolution UI onto a conflict-free system — surface what changed, don't ask users to resolve what already merged.*

## F/G — Close
- Squash: `feat(sprint-08): offline-first editing and merge (closes #…)`
- Deferred: offline media upload queue, selective sync (large workspaces).
- Recap idea: *offline-first on a CRDT means the scary part (merge) is free — the remaining bugs live in the code you wrote around it, not in the merge itself.*
