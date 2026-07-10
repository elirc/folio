# Sprint 05 — Naive Real-Time (Deliberately Broken) → v0.5.0

**Branch:** `sprint-05/naive-realtime` · **Size:** M/L · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** Ship multiplayer — *badly, on purpose*. Broadcast whole-document saves over WebSocket with last-write-wins. It will demo beautifully for one typist and corrupt data the instant two people edit together. This is the most important "failure" in the whole curriculum: the learner must *feel* why CRDTs exist before building one. Ends the MVP at v0.5.0 with a known, documented, deliberate flaw.

## A — Issues
1. `Broadcast doc changes over WS (whole-doc, debounced) to other viewers`
2. `Basic presence (who's here) + live cursor position (naive)`
3. `Deploy + E2E + demo; v0.5.0 — with the LWW flaw documented, not hidden`
4. `The "feel the pain" lab setup`

## B — Commits
| # | Commit | Notes |
|---|--------|------|
| 1 | `[L] feat(sync): broadcast whole-doc on save; apply received doc to other clients` | **[flaw #1, announced]** last-write-wins: the later save clobbers the earlier; this is *the* problem the next two sprints solve |
| 2 | `[L] feat(web): naive presence + cursors (best-effort)` | cursors jump/misplace under concurrent edits — also by nature |
| 3 | `[A] test(sync): TWO-CLIENT CONCURRENT EDIT → one client's paragraph VANISHES` | the damning test, committed *passing-as-in-it-reproduces-the-bug*: it asserts the data loss, documenting the flaw as a known fact |
| 4 | `[L] feat: deploy, health, demo doc (fast-forward)` | |
| 5 | `[A] docs: ADR-0005 — "why this is broken and what fixes it"` | the honest ADR: LWW clobbers concurrent edits; explains the class of problem (no notion of concurrent intent), previews CRDTs; links flaw #1 |
| 6 | `[L] docs: curriculum note — the concurrency demo script (make it break yourself)` | |

## C — Review order
Read commit 3's test output first (watch a paragraph die) → the broadcast code (1) → ADR-0005.

## D — Teaching comments (~7)
- LWW clobber — 📘 the core lesson set-up: last-write-wins has no concept of *concurrent* changes — it only knows "latest"; two people editing = the slower typist's work erased; this isn't a bug to fix in this PR, it's the *motivation* for the next two
- the damning test — 🔍 review-lens: a test that *documents a known failure* (rather than asserting correctness) is a legitimate artifact — it turns "trust me, it's broken" into a reproducible fact and becomes the regression test S7 must flip to green
- cursors under concurrency — 📘 even presence breaks: a cursor is an offset into a document that's changing underneath it; absolute offsets are meaningless during concurrent edits — 🔗 foreshadows the S9 comment-anchoring flaw
- announced flaw — 📘 unlike hidden planted flaws, this one is loudly documented; the pedagogy is *experiential* — the learner should open two tabs and destroy their own document before S6
- v0.5.0 with a known flaw — 🔍 review-lens: shipping a deliberately-limited MVP with documented constraints is honest; "multiplayer (beta, single-editor-at-a-time)" is a real product stage

## E — Debate
**"Fix concurrency with operational locking (one editor at a time) vs build real concurrent editing?"** Locking: shippable now, but it's not the product (Google Docs doesn't lock). Real concurrency: hard, the whole point. **Resolution:** neither yet — ship the broken LWW *as a felt problem*, then build the real thing (S6–S7). A lock would let us avoid the lesson; we refuse. Lesson: *sometimes the right move is to not paper over the hard problem — feel it fully, then solve it properly.*

## F/G — Close
- Squash: `feat(sprint-05): naive real-time multiplayer (deliberately LWW) (closes #…)`
- **Post-merge:** deploy → demo → tag **`v0.5.0`** → MVP retro (framed as "half the product; the hard half is next").
- **Lab (feel-the-pain):** the learner runs structured two-client experiments, logs every way LWW corrupts the doc, and writes the requirements for a fix *in their own words* — those requirements become S6's spec.
- Ledger: flaw #1 recorded (announced).
- Recap idea: *you can't appreciate a CRDT until last-write-wins has eaten your paragraph — now go build the thing that won't.*
