# Sprint 09 — Presence, Comments & Suggestions

**Branch:** `sprint-09/presence-comments` · **Size:** L · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** The collaboration humans see: live cursors and selections (multiplayer awareness), anchored comments, and suggestion mode (tracked changes). The hard problem is **anchoring** — a comment must stay attached to its text as everyone edits around it. Relative positions solve the happy path; a planted flaw in absolute-offset thinking sets up S13.

## A — Issues
1. `Live cursors + selections (awareness, from S7) with user colors/labels`
2. `Comments anchored to document ranges (stay attached through edits)`
3. `Suggestion mode: proposed edits as tracked changes, accept/reject`
4. `Comment threads, resolution, notifications`

## B — Commits
| # | Commit | Notes |
|---|--------|------|
| 1 | `[L] feat(editor): live cursors + selections via awareness — colored carets, name labels, smooth interpolation` | 🔗 S7 awareness channel; the learner builds the UI |
| 2 | `[L] feat(editor): comment anchoring — [absolute offsets first]` | **[flaw #3 seed]** anchors as absolute character offsets |
| 3 | `[A] feat(editor): Yjs relative positions — anchors survive concurrent edits` | AI introduces `Y.RelativePosition`: an anchor tied to CRDT *identity*, not offset; the happy path works; commit body flags that edge cases (anchored text deleted, cross-block ranges) need hardening (S13) |
| 4 | `[L] test(editor): concurrent-edit anchor drift — absolute offsets drift (proves flaw), relative positions hold` | the test contrasts both approaches: absolute anchors point at the wrong text after a concurrent insert; relative ones stay put |
| 5 | `[L] feat(db+editor): Comment model anchored by relative position; thread UI, resolve` | |
| 6 | `[L] feat(editor): suggestion mode — edits as marks (insertions/deletions proposed), accept/reject applies to the Y.Doc` | tracked changes as a mark layer over the CRDT |
| 7 | `[L] feat(api): comment/mention notifications (fast-forward)` | |
| 8 | `[L] test(e2e): two-user — A comments on a phrase, B edits before it, comment stays anchored; suggestion accepted converges` | |
| 9 | `[A] docs: ADR-0009 anchoring via relative positions; curriculum note` | |

## C — Review order
Awareness cursors (1) → **the anchoring contrast (2 absolute → 3 relative → 4 the drift test)** → suggestion mode (6).

## D — Teaching comments (~10)
- awareness cursors — 📘 presence over the ephemeral channel; a remote cursor is that user's selection *mapped through* document changes — Yjs relative positions make the mapping automatic
- anchoring is the hard problem — 📘 the sprint's core: a comment says "this is about *these words*"; as everyone edits, "these words" move; absolute offsets point at whatever text now sits at that number (usually wrong) — 🔗 the exact failure S5's naive cursors had
- relative positions — 📘 `Y.RelativePosition` anchors to element *identity* (the crdt-101 lesson!): the anchor tracks the character, not the coordinate; this is only possible because of the CRDT's stable identities — feel how S6's foundation enables S9's feature
- flaw #3 seed — 🔍 review-lens: the AI review of L's commit 2 (absolute offsets) explicitly compares to relative — but the *edge cases* (anchor's text deleted entirely, ranges spanning concurrent structural edits) are left for S13; the happy path shipping first is honest scoping, the edges are the planted debt
- suggestion mode as marks — 📘 tracked changes as a mark layer: a "deletion suggestion" is a mark, not an actual delete, until accepted; accept/reject are transactions on the Y.Doc
- drift test — 🔍 the test that shows both approaches side by side is the clearest possible teaching of why relative positions exist

## E — Debate
**"Comment anchoring: relative positions vs anchor to block id + offset vs fuzzy text match?"** Block+offset: simpler, but breaks within-block edits. Fuzzy match: robust to structure but can re-anchor to the wrong identical phrase. Relative positions: CRDT-native, precise. **Resolution:** relative positions as primary (S13 adds a fuzzy fallback for when anchored content is fully deleted). Lesson: *anchoring in a collaborative doc is a first-class hard problem; the CRDT's stable identities are the tool — but deleted anchors still need a fallback story.*

## F/G — Close
- Squash: `feat(sprint-09): presence, anchored comments, suggestions (closes #…)`
- **Lab:** the learner stress-tests anchoring — two users, one comments while the other rewrites the surrounding paragraph, delete the anchored text entirely — and documents where relative positions hold and where the S13 edge cases bite.
- Ledger: flaw #3 seeded (absolute-offset thinking + deleted-anchor edge cases → S13).
- Recap idea: *comments that stay put through everyone's edits are only possible because the CRDT gave every character a name in S6.*
