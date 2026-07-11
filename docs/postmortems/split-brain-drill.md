# Postmortem — Split-Brain Drill (blameless)

**Type:** planned drill (not an incident) · **Date:** S15 · **Severity simulated:** P1 (network partition)

## Summary
We deliberately partitioned two sync instances holding the same document, had both halves accept edits, then
healed the partition — to prove the CRDT converges with no lost edits (the scenario S05's last-write-wins
could never survive).

## Timeline
- **T+0** — Partition injected. Instance A and instance B can no longer exchange updates.
- **T+0–T+3m** — Users on both halves keep editing. A takes two edits; B takes one. State vectors diverge.
- **T+40s** — Convergence-health monitor flips to `suspect`, then pages later than the SLO wanted (see finding).
- **T+3m** — Partition healed. Instances exchange update logs automatically.
- **T+3m02s** — Both instances converge: all four edits present, identical documents, health returns
  `healthy`. No manual intervention, no discarded edits.

## What went well
- **The CRDT converged, losslessly.** Every edit from both halves survived and reconciled — the core
  guarantee held under a real partition, at the infrastructure level (`splitbrain.convergence.test.ts`).
- The runbook (§3) correctly instructed "do nothing manual — it converges on heal." No operator picked a
  winner (which would have destroyed a half, S05-style).

## What lagged (the finding)
The convergence-health alert fired later than desired: the initial threshold (1 non-healthy check) was
suppressed to avoid paging on normal mid-propagation lag, but the retune left the *real* divergence surfacing
slower than the SLO. **Action item AI-1:** tune the alert to distinguish `suspect` (in-flight, tolerate a
short streak) from `diverged` (page immediately) — implemented as `DivergenceAlerter` with a 3-check suspect
threshold and immediate `diverged` paging (S15 commit 8). A heal-window regression test guards it.

## Action items
- **AI-1 (done):** convergence-alert threshold tuning — immediate on `diverged`, streak on `suspect`.
- **AI-2 (deferred):** automated partition injection in staging (Jepsen-style), monthly.

## The lesson
*The network split the servers, both sides kept editing, and the document healed itself.* That is the whole
curriculum in one drill: understand the hard problem deeply (S06), adopt the right tool knowingly (S07), and
the impossible-looking scenario becomes routine — a planned drill with a boring, correct outcome.
