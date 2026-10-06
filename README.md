# Folio

A collaborative document editor (a Notion-class clone: block-based rich text, real-time multiplayer,
offline merge, comments, permissions, version history) — built as a **15-sprint upskilling curriculum**,
where every sprint is one pull request loaded with teaching artifacts: heavily annotated code, ADRs,
planted design debates, and inline review commentary.

> **This repo is a course — and the CAPSTONE.** The code is real and runs; the commit history, PR reviews,
> ADRs, and curriculum notes are the actual product. Unlike the earlier courses, **the learner co-authors
> heavily** (commits tagged `[L]`) and the AI shifts toward reviewer. Start with
> [`docs/LEARNER-GUIDE.md`](docs/LEARNER-GUIDE.md), then read
> [ADR-0002 — the CRDT roadmap](docs/adr/).

**Course 6** of a larger curriculum (following Tracer, Relay, and others). Status (as of 2026-10-06):
**complete** — all 15 sprints merged as squash-merged PRs #5–#75; see
[`COURSE-RETROSPECTIVE.md`](COURSE-RETROSPECTIVE.md) and the post-course study path in the learner guide.

## The thesis: earn the abstraction three times
- **S5** — build multiplayer *wrong* (last-write-wins). Feel the data loss.
- **S6** — build a **toy CRDT from scratch** (`packages/crdt-101`) with a convergence fuzzer. Understand
  sequence CRDTs in the bones.
- **S7** — adopt **Yjs**, knowingly. A hand-rolled CRDT for rich text is a research project; you adopt the
  real one because you built a toy one.

*Build it once badly to understand it, then adopt the real thing knowingly.*

## What it will teach
- **CRDTs / OT** — conflict-free collaborative editing from first principles, then with a real library.
- **Distributed consistency** — convergence, causality, intention preservation, offline merge.
- **Presence** — cursors, selections, awareness at real-time fidelity.
- **Rich structured documents** — block-based, nested, a real editor (ProseMirror), not a textarea.

## Planned stack
- **Monorepo:** pnpm workspaces + Turborepo · TypeScript strict · Node
- **Web:** React + Vite SPA (the editor is the app) — `apps/web`
- **Editor:** ProseMirror (schema-based rich text)
- **CRDT (learning):** `packages/crdt-101` — hand-built sequence CRDT + fuzzer
- **CRDT (production):** Yjs + `y-prosemirror`, a custom WebSocket provider
- **API / transport:** Fastify + `ws` gateway — `apps/api` (Redis pub/sub for multi-instance fan-out was
  planned and is provisioned in `packages/db/docker-compose.yml`, but no code publishes to it yet)
- **Data:** PostgreSQL + Prisma (Yjs update log + periodic snapshots)
- **Offline:** IndexedDB (y-indexeddb + custom)

## Course docs
- [`docs/LEARNER-GUIDE.md`](docs/LEARNER-GUIDE.md) — how to study the repo (and how *you* co-author)
- [`SPEC.md`](SPEC.md) — product spec, domain model, competency additions
- [`docs/sprints/`](docs/sprints/) — the 15 sprint playbooks + the ritual (`00-workflow.md`)
- [`docs/adr/`](docs/adr/) — architectural decisions (ADR-0002 is the roadmap)
- [`githelp.md`](githelp.md) — the git/GitHub operator manual for driving each sprint

## The signature idea
> Convergence is earned three times — a broken naive version to feel the need, a toy CRDT to understand
> the mechanism, and the real library adopted knowingly. Convergence is sacred: from S6 on, fuzzers gate
> any change that could break it.
