# Sprint 01 — Foundation: Doc Skeleton + WS Echo

**Branch:** `sprint-01/foundation` · **Size:** S · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** Fast-forward scaffold (the learner has done this five times — mostly `[L]`); the walking skeleton loads and saves a plaintext document and has a WS echo. The defining artifact is ADR-0002: the CRDT roadmap that frames the whole capstone.

## A — Issues
1. `Monorepo scaffold (learner-led fast-forward)`
2. `Skeleton: create doc, load/save plaintext, WS echo`
3. `CI + governance (learner-led)`
4. `ADR-0001 SPA; ADR-0002 the CRDT roadmap (naive → toy CRDT → Yjs)`

## B — Commits
| # | Commit | Notes |
|---|--------|------|
| 1 | `[L] chore: monorepo scaffold` | learner does it solo now; AI reviews for drift only |
| 2 | `[L] feat(db): Node (doc) + DocState (plaintext for now)` | |
| 3 | `[L] feat(api): create/load/save doc + ws gateway echo` | |
| 4 | `[L] feat(web): SPA shell + a textarea bound to the doc + ws connection` | |
| 5 | `[L] test + ci (fast-forward)` | |
| 6 | `[A] docs: ADR-0002 — the CRDT roadmap` | **the capstone's framing document**: S5 ships naive LWW (and it will be broken *on purpose*), S6 builds a toy CRDT to understand the problem, S7 adopts Yjs knowingly; names what each phase teaches and throws away |
| 7 | `[L] docs: ADR-0001 SPA; curriculum note` | |

## C — Review order
ADR-0002 (6) — it frames all 15 sprints → the skeleton (learner's, AI-reviewed).

## D — Teaching comments (~6)
- ADR-0002 roadmap — 📘 the capstone thesis stated up front: we will build multiplayer *wrong* (S5), then build a toy CRDT to feel why it's hard (S6), then adopt the real one understanding every part (S7); the throwaway naive version is a teaching investment, not waste — 🔗 this is the "build-once-badly-then-adopt" pattern every prior course rehearsed in miniature (XState, Temporal, vector DBs)
- learner-led scaffold — 🔍 review-lens: AI review of `[L]` commit 1 is light — five courses in, monorepo setup is muscle memory; the review notes only what's *different* here (ws in the skeleton)
- textarea placeholder — 📘 honest placeholder: a textarea is not the editor (S3 brings ProseMirror); it exists so save/load/ws are real before the editor complexity lands
- DocState as plaintext — 🔗 this column becomes a Yjs update log by S7; naming it DocState now (not `content`) leaves room to grow

## E — Debate
**"Store documents as plaintext/JSON now vs design for CRDT from the start?"** CRDT-from-start: no migration later, but premature — we don't understand the shape yet (that's S6's job). Plaintext: simple, and the migration *is* pedagogically the point. **Resolution:** plaintext now; the naive→toy→Yjs migrations are curriculum, not accidents. Lesson: *don't design for an abstraction you don't yet understand — earn it first* (the capstone restating its own thesis).

## F/G — Close
- Squash: `feat(sprint-01): foundation — doc skeleton, ws echo (closes #…)`
- Recap idea: *the roadmap says we'll build multiplayer wrong on purpose — trust the plan; the wrong version teaches the right one.*
