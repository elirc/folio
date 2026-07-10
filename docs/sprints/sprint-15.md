# Sprint 15 — Production Readiness → v1.0.0 (Capstone Finale)

**Branch:** `sprint-15/production-readiness` · **Size:** L · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** Operate a stateful collaborative system and graduate the learner. Sync/document observability, a **split-brain incident drill** (the CRDT's ultimate test), graceful deploys of a stateful sync layer, backup/restore of the update log, runbooks — and the curriculum-wide retrospective. `v1.0.0`, and the end of the six-course journey.

## A — Issues
1. `Observability: sync-lag, document-load time, active-doc/connection metrics, convergence health, Sentry`
2. `Alerting: sync-lag SLO, load-time regression, update-log growth, error spikes`
3. `Ops: graceful stateful deploy (drain docs, handoff), update-log backup/restore drill`
4. `Split-brain drill: partition instances mid-edit → heal → prove convergence; runbooks`
5. `Release: v1.0.0, capstone retro, six-course curriculum retrospective`

## B — Commits
| # | Commit | Notes |
|---|--------|------|
| 1 | `[L] feat(obs): sync-lag + document-load tracing; per-doc active connections; update rate` | the metrics that describe a collaborative system's health; the learner instruments reflexively now |
| 2 | `[L] feat(obs): convergence health — periodic cross-instance state-vector comparison for active docs` | ⚠️ divergence detection: if two instances hold different states for one doc, alarm — the CRDT should prevent it, so an alert means a real bug |
| 3 | `[L] feat(obs): Sentry with sync context (doc id, connection state, pending updates); PII-safe (no doc content)` | |
| 4 | `[L] feat(sync): graceful stateful deploy — drain: persist active docs, migrate connections to new instance, clients reconnect` | 🔗 the reconnect discipline (S7/S8) makes stateful deploys survivable; hardest deploy story in the curriculum (the server holds live document state) |
| 5 | `[L] feat(ops): update-log + snapshot backup; tested restore with convergence verification` | restore a doc, reconnect live clients whose state is *ahead* of the backup → forced re-sync (🔗 the seq-regression lesson from Tracer S15, CRDT-shaped) |
| 6 | `[A] test(drill): SPLIT-BRAIN — partition two instances, both take edits to one doc, heal the partition (P1 drill)` | **the capstone's ultimate test:** the network splits, both halves accept edits, then reunite; the CRDT must converge to one consistent document with no lost edits — the thing S5's LWW could never do, proven at the infrastructure level |
| 7 | `[A] docs: postmortem — the split-brain drill (blameless); what converged, what lagged, action items` | |
| 8 | `[L] fix: drill action item — convergence-health alert threshold tuning` | |
| 9 | `[L] docs: runbooks — sync lag, divergence, split-brain recovery, update-log restore, stuck doc, rollback` | |
| 10 | `[L] chore(release): changelog, staging/prod docs, README refresh` | |
| 11 | `[A] docs: capstone retro + SIX-COURSE CURRICULUM RETROSPECTIVE` | the finale document (see below) |

## C — Review order
Convergence-health detection (2) → graceful stateful deploy (4) → **the split-brain drill (6→7): the CRDT's ultimate proof** → the six-course retro (11).

## D — Teaching comments (~9)
- convergence-health monitoring — 📘 in a CRDT system, divergence should be *impossible*; therefore a divergence alert is a high-signal "we have a real bug" indicator, not routine noise — monitor the invariant your architecture promises
- **split-brain drill** — 📘 the capstone's crowning moment: a network partition is the scenario that destroys naive systems (S5's LWW would silently pick one half and discard the other); the CRDT *converges* — both halves' edits survive and reconcile; this drill is the entire six-course arc's thesis made physical: understand the hard problem (S6), adopt the right tool (S7), and the impossible-looking scenario becomes a non-event
- stateful deploy — ⚠️ the hardest deploy in the curriculum: the server holds live document state and open sockets; drain = persist + migrate connections; the S7/S8 reconnect machinery is what makes it survivable — failure-handling and deploy-handling converge one final time
- restore ahead-of-backup — 🔗 Tracer S15's seq-regression, CRDT-shaped: clients whose state is newer than the restored backup must re-sync forward, not be rewound; restoring a collaborative doc is subtler than restoring a row
- graceful drain via reconnect — 🔗 the cross-course law (Tracer/Pulse/Relay/Harbor all taught it): systems that handle failure deploy for free; here it graduates
- PII-safe telemetry — 🔗 never ship document content to Sentry; the redaction discipline from Harbor/Pulse

## E — Debate (the final debate)
**"Was building crdt-101 (S6) worth a whole sprint, given we adopted Yjs anyway?"** Skeptic: we threw it away; that's a sprint of "wasted" work. Advocate: without it, every decision in S7–S15 — the custom provider, the anchor model, the compaction, the split-brain confidence — would have been cargo-culted; we'd have adopted Yjs as a magic box and been unable to debug, secure, or operate it. **Resolution:** unequivocally worth it — and this is the six-course thesis: *the framework you adopt without first building a toy version is a liability; the one you adopt after is a tool.* Every course rehearsed this (XState, Temporal, ClickHouse, vector DBs, Yjs); the capstone proves it. Lesson: **understanding is not optional infrastructure — it's the thing that lets you adopt, operate, secure, and debug everything else.**

## F/G — Close & Release
- Squash: `feat(sprint-15): sync observability, split-brain drill, capstone finale (closes #…)`
- **Release sequence:** merge → deploy → smoke (multi-client convergence E2E vs prod) → tag **`v1.0.0`** → GitHub Release → recorded demo (two users editing live, one goes offline and rejoins, edits converge) → close milestone.
- **Six-course curriculum retrospective** (`docs/curriculum/RETROSPECTIVE.md`): the competency matrix across all six products; the recurring lessons that appeared in every course (idempotency, identity resolution, the durable/ephemeral split, authz-per-transport, the framework-adoption thesis, audit-first hardening, the flaw-ledger method); the learner's journey from observer (Meridian) to co-author (Folio) to solo shipper (Relay S14, and this capstone); what a senior engineer looks like now; where to go next.
- Recap idea: *the network split the servers, both sides kept editing, and the document healed itself — that's the whole curriculum in one drill: understand the hard problem deeply, and the impossible becomes routine.*

---

## 🎓 End of the six-course curriculum

**Meridian** (workflows, money, queues) → **Tracer** (real-time sync, offline-first) → **Pulse** (data pipelines, scale) → **Relay** (orchestration, untrusted code) → **Harbor** (LLM features done right) → **Folio** (distributed consistency, the capstone).

The learner who started by *reading* Meridian's PRs now *ships* a split-brain-surviving collaborative editor and can review anyone's code. That transition — observer to author to peer — was the point all along.
