# Folio — Sprint Execution Workflow (Capstone)

Same ritual as prior courses; restated so this folder is self-contained. The capstone difference: **the learner co-authors throughout**, so the "author/reviewer" roles partially invert.

## Roles
- **Author/Reviewer (AI):** proposes each sprint's design and ADRs, writes the scaffolding and the hard reference implementations, and — increasingly — **reviews the learner's code**. Writes teaching comments as review feedback on the learner's commits.
- **Learner (near-peer):** predicts, then co-authors a substantial share of each sprint (target ~50%+ from S3). Writes convergence tests. The teaching artifact is the AI's review of *their* work, plus the reference implementations for the parts too deep to hand off cold.

Commits are tagged `[L]` (learner-authored, AI-reviewed) or `[A]` (AI reference implementation, learner-studied). Most sprints mix both.

## Lifecycle (Phases A–G)
- **A — Setup:** milestone, 3–6 issues, branch `sprint-NN/<slug>`.
- **B — Build:** ordered conventional commits, `[L]`/`[A]` tagged. `[flaw]` logged in `flaw-ledger.md`; `[fix-later-in-PR]` = broken → failing test → fix as a story.
- **C — Draft PR:** template body incl. **How to review** order. CI green unless scripted.
- **D — Teaching comments:** on `[L]` commits these are *review feedback*; on `[A]` commits they explain the reference. Prefixes: `📘 concept` · `🔍 review-lens` · `⚠️ pitfall` · `🔗 connects`.
- **E — Planted debate:** question → options → resolution (+ ADR/commit).
- **F — Finalize:** curriculum note with exercises + the learner's design retro; squash-merge `feat(sprint-NN): … (closes #…)`.
- **G — Post-merge:** deploy check (S5+), deferred issues, milestone close, Sprint Recap, lab if scheduled, tags at S5/S15.

## Folio-specific rules
1. **Convergence is sacred:** from S6, a convergence fuzzer (random concurrent op interleavings must reach identical state) runs in CI. No change that can break convergence merges without the fuzzer green.
2. **Understand-then-adopt:** the toy CRDT (S6) precedes Yjs (S7) deliberately; the S7 adoption ADR uses the learner's own toy as the comparison baseline. This is the capstone's central lesson.
3. **Learner co-authorship:** each sprint's playbook marks which commits are `[L]`; the AI's review of them is the primary teaching artifact.
4. **Depth over breadth:** prefer exploring one hard thing fully over shipping many shallow features.
5. **Labs:** after S5 (feel-the-pain), S7, S9, S13.
6. Conventions otherwise identical: squash-only linear `main`, Conventional Commits, no red merges, TODOs need issues, flaw harvests quote the ledger.
