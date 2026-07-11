# The Six-Course Curriculum — Retrospective

Folio is the capstone of a six-course journey that takes a junior engineer to mid/senior by building
production-grade clones, each a git-connected sequence of teaching-rich PRs.

## The arc

| Course | Product | Core competency |
|--------|---------|-----------------|
| **Meridian** | Workflows, money, queues (EOR/payroll) | Durable execution, idempotency, money-safe operations — *the learner observes* |
| **Tracer** | Linear-clone (real-time issues) | Real-time sync, offline-first, channel authorization |
| **Pulse** | PostHog-clone (analytics) | Data pipelines, rollups/compaction, scale |
| **Relay** | Zapier-clone (orchestration) | Durable orchestration, untrusted-code sandboxing, connector SDKs |
| **Harbor** | Intercom-clone (support + AI) | LLM features done right: eval-before-feature, grounding, cost as a metric |
| **Folio** | Notion-clone (collaborative editor) | Distributed consistency (CRDTs) — *the learner ships & operates* — **the capstone** |

## The recurring lessons (each appeared in multiple courses)
- **Idempotency & exactly-once** — Meridian's money ops, Relay's steps, Yjs's mergeable updates.
- **Identity resolution** — dedupe keys, connector natural keys, crdt-101's element identity.
- **The durable vs. ephemeral split** — durable state vs. ephemeral presence/awareness (Tracer → Folio, 4×).
- **Authz per transport, not per request** — Tracer channels, Relay webhooks, Folio update messages (flaw #5).
- **The framework-adoption thesis** — build the toy, then adopt the tool: XState, Temporal, ClickHouse,
  vector DBs, Yjs. *Understanding is what lets you adopt, operate, secure, and debug everything else.*
- **Audit-first hardening + the flaw-ledger method** — plant a realistic flaw, harvest it with a permanent
  test, quote the ledger.
- **Projections / read-write-path split** — analytics rollups, search indexes, the update-log-as-history.
- **Systems that handle failure deploy for free** — reconnect → offline-first → graceful stateful drain.

## The learner's journey: observer → author → peer
- **Observer (Meridian):** reads AI-authored PRs; studies the reasoning.
- **Author (Tracer → Relay):** co-authors (`[L]`/`[A]`), then solo-ships whole sprints.
- **Peer (Folio):** drives the audit (S13), reviews the AI's deepest fixes, and ships + operates a
  split-brain-surviving distributed system.

## What a senior engineer looks like now
Can pick a framework by first understanding the problem it solves; can classify state, authorize transports,
bound append-only growth, and prove convergence; treats correctness as a property pinned in CI, not an
example; and hardens audit-first. Most of all: **adopts tools knowingly, and can debug/secure/operate what
they adopt** — because they've built the small honest version of the hard thing.

## Where to go next
Real distributed systems (Jepsen-style testing), formal methods (TLA+ for the protocols you now grasp
intuitively), and leading a team through the same "understand, then adopt" discipline you just lived.

*Six products, one thesis: understand the hard problem deeply, and the impossible becomes routine.*
