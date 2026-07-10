# Folio Sprint Playbooks (Capstone)

Execution scripts for the 15-sprint build of **Folio** (collaborative document editor — see [SPEC.md](../../SPEC.md)). Course 6, the capstone; assumes all prior courses. **The learner co-authors throughout** — the AI increasingly reviews rather than writes.

**Start here:** [00-workflow.md](00-workflow.md) — the ritual plus capstone rules (convergence-is-sacred, understand-then-adopt, learner co-authorship, `[L]`/`[A]` commit tags).

| Sprint | Playbook | Headline |
|--------|----------|----------|
| 01 | [sprint-01.md](sprint-01.md) | Foundation: doc skeleton + ws echo |
| 02 | [sprint-02.md](sprint-02.md) | Document tree & permissions v1 |
| 03 | [sprint-03.md](sprint-03.md) | The block editor (single-user, ProseMirror) |
| 04 | [sprint-04.md](sprint-04.md) | Editor depth: nesting, media, keyboard |
| 05 | [sprint-05.md](sprint-05.md) | Naive real-time (deliberately broken) → `v0.5.0` |
| 06 | [sprint-06.md](sprint-06.md) | crdt-101: build a CRDT from scratch (learner-led) |
| 07 | [sprint-07.md](sprint-07.md) | Adopt Yjs + custom provider (flagship) |
| 08 | [sprint-08.md](sprint-08.md) | Offline-first & merge (dialogue) |
| 09 | [sprint-09.md](sprint-09.md) | Presence, comments & suggestions |
| 10 | [sprint-10.md](sprint-10.md) | Persistence, snapshots, version history |
| 11 | [sprint-11.md](sprint-11.md) | Permissions v2: ACL inheritance & sharing |
| 12 | [sprint-12.md](sprint-12.md) | Performance: large docs & many cursors |
| 13 | [sprint-13.md](sprint-13.md) | Hardening: convergence chaos & security |
| 14 | [sprint-14.md](sprint-14.md) | Search, export & polish |
| 15 | [sprint-15.md](sprint-15.md) | Production readiness → `v1.0.0` |

**The central arc:** feel the pain (S5 naive LWW clobbers edits) → understand it (S6 build a toy CRDT + fuzzer) → adopt knowingly (S7 Yjs, with your toy as the baseline). This "build-once-badly-then-adopt" pattern was seeded in every prior course's framework debate (XState, Temporal, vector DBs) and is *the* capstone lesson. Ledger: [flaw-ledger.md](flaw-ledger.md).
