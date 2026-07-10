# ADR-0002: The CRDT roadmap — naive → toy CRDT → Yjs

- **Status:** Accepted
- **Date:** 2026-07-10
- **Sprint:** S01
- **Deciders:** Folio authors (capstone)

## Context
Folio's defining hard problem is **conflict-free collaborative editing**: many people editing one rich
document at once, offline and reconnecting, and everyone converging to the same result. This is a research
area, not a weekend feature. The temptation is to reach for the production library (Yjs) on day one — but
you cannot *evaluate* or *operate* a CRDT you don't understand, and a team that adopts one as a black box
will misuse it and be unable to debug it. This ADR sets the roadmap that frames all 15 sprints, so the
build order is a deliberate teaching sequence, not accidental churn.

## Decision
**Earn convergence three times**, each phase teaching something the next depends on and then discarding
what it needs to:

1. **S05 — Naive last-write-wins, on purpose broken.** Real-time multiplayer where the whole document is
   one string and the last save wins. It *will* lose data under concurrent edits, and it will feel wrong.
   That failure is the investment: you must **feel the need** before the fix means anything. (Throwaway —
   we delete it.)
2. **S06 — A toy CRDT from scratch** (`packages/crdt-101`, a sequence CRDT in the RGA/Logoot family) with a
   **convergence fuzzer**. Hand-building it teaches sequence CRDTs *in the bones* — causality, tombstones,
   intention preservation, why concurrent inserts converge. (Throwaway as production code — but the
   understanding is permanent.)
3. **S07 — Adopt Yjs, knowingly** (the flagship). A hand-rolled CRDT for *rich text* (nested blocks,
   formatting, undo) is a multi-year project; Yjs already solved it. We adopt it with `y-prosemirror` and a
   **custom WebSocket provider** — and because we built a toy one, we know exactly what Yjs is doing, can
   reason about its update log, and can debug it as a peer.

DocState is **plaintext** until S07, then becomes a **Yjs update log + periodic snapshots**. The name
`DocState` (not `content`) is chosen now to survive that change.

## Alternatives considered
- **Design for a CRDT from the start (S01).** No migration later — but premature: we don't yet understand
  the shape a CRDT wants (that's literally S06's job), so we'd be designing for an abstraction we can't
  evaluate. The naive→toy→Yjs migrations are *curriculum*, not accidents.
- **Operational Transformation (OT) instead of CRDTs.** OT is the older lineage (Google Docs); powerful but
  requires a central server to transform and order operations, and is notoriously hard to get right
  offline. We revisit OT-vs-CRDT in the S06/S07 debates; CRDTs suit local-first + offline better.
- **Adopt Automerge instead of Yjs.** Compared in the S07 ADR. Yjs is chosen for performance and the
  maturity of its ProseMirror binding — but the point is we'll choose it *with our toy CRDT as the
  baseline for comparison*, not on faith.

## Consequences
- The build order is a teaching sequence: a deliberately broken S05, a throwaway-but-illuminating S06, and
  a knowing adoption in S07. **The wrong version teaches the right one.**
- Convergence becomes sacred from S06: fuzzers gate any change that could break it.
- This ADR is the through-line — every sync sprint refers back to it. It is the capstone restating the
  whole curriculum's thesis: *build it once badly to understand it, then adopt the real thing knowingly;
  don't design for an abstraction you haven't earned.*

## Links
- `packages/db` (DocState), `docs/sprints/sprint-05.md` (naive), `sprint-06.md` (crdt-101),
  `sprint-07.md` (Yjs), ADR-0001 (SPA), `docs/sprints/sprint-01.md`
