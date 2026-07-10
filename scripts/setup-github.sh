#!/usr/bin/env bash
# Folio — one-time GitHub setup: labels + milestones (+ enable Discussions).
# Prereqs: `gh auth login` done, and you are inside the folio repo with an `origin` remote.
# Usage:   bash scripts/setup-github.sh
# Safe to re-run: labels use --force; milestone creation tolerates duplicates.

set -uo pipefail

echo "==> Repo: $(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo '??? (run inside the repo, after gh auth login)')"

label() { gh label create "$1" --color "$2" --description "$3" --force >/dev/null 2>&1 && echo "  label: $1"; }

echo "==> Creating labels"
for n in 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15; do
  label "sprint-$n" "ededed" "Sprint $n"
done
label "phase-mvp"  "0e8a16" "Phase 1 — MVP (S01–S05)"
label "phase-full" "1d76db" "Phase 2 — full product (S06–S15)"
# Teaching topics (Folio-specific / capstone)
label "teaching:crdt"          "5319e7" "CRDTs / OT, convergence, causality"
label "teaching:collaboration" "5319e7" "Real-time multiplayer / sync"
label "teaching:editor"        "1d76db" "ProseMirror / rich-text document model"
label "teaching:offline"       "5319e7" "Offline-first editing & merge"
label "teaching:presence"      "1d76db" "Cursors, selections, awareness"
label "teaching:performance"   "fbca04" "Virtualization, batching, budgets"
label "teaching:security"      "b60205" "ACL, convergence chaos, hardening"
label "teaching:testing"       "0e8a16" "Convergence fuzzing / multi-context E2E"
# Process (capstone: learner co-authors heavily)
label "learner-authored" "0e8a16" "[L] substantially written by the learner; AI reviews"
label "planted-debate"   "d93f0b" "A deliberate design debate thread lives on this PR"
label "deferred"         "c5def5" "Deferred work, filed as a linked issue"
label "lab"              "fef2c0" "Post-sprint practice branch/exercise"
label "adr"              "bfd4f2" "Introduces or changes an ADR"
label "good-first-read"  "7057ff" "A good PR for the learner to study first"

echo "==> Creating milestones (one per sprint)"
milestone() {
  gh api "repos/{owner}/{repo}/milestones" -f title="$1" -f state=open >/dev/null 2>&1 \
    && echo "  milestone: $1" || echo "  milestone exists/skip: $1"
}
milestone "Sprint 01 — Foundation: doc skeleton + WS echo"
milestone "Sprint 02 — Workspaces, document tree & permissions v1"
milestone "Sprint 03 — The block editor (single-user)"
milestone "Sprint 04 — Editor depth: nesting, media, keyboard"
milestone "Sprint 05 — Naive real-time (last-write-wins) → v0.5.0"
milestone "Sprint 06 — crdt-101: build a sequence CRDT from scratch"
milestone "Sprint 07 — Adopt Yjs + custom provider (flagship)"
milestone "Sprint 08 — Offline-first & merge"
milestone "Sprint 09 — Presence, comments & suggestions"
milestone "Sprint 10 — Persistence, snapshots & version history"
milestone "Sprint 11 — Permissions v2: ACL inheritance & sharing"
milestone "Sprint 12 — Performance: large docs & many cursors"
milestone "Sprint 13 — Hardening: convergence chaos & security"
milestone "Sprint 14 — Search, export & polish"
milestone "Sprint 15 — Production readiness (v1.0.0)"

echo "==> Enabling Discussions (for Sprint Recap posts)"
gh api -X PATCH "repos/{owner}/{repo}" -F has_discussions=true >/dev/null 2>&1 \
  && echo "  discussions: on" || echo "  discussions: could not toggle (enable in Settings if needed)"

echo "==> Done. Next: open Sprint 01 (see githelp.md §3)."
