# Folio — Collaborative Document Editor (Notion-Style) · CAPSTONE

## Project Spec & 15-Sprint Upskilling Curriculum (Course 6 — Capstone)

**Version:** 1.0 · **Date:** 2026-07-09 · **Folder:** `folio/` (splits into its own repo later)

---

## 1. Purpose

The capstone. The hardest domain in product engineering, taken last on purpose — every prior course's lessons converge here, and **the learner co-authors heavily throughout** (not just S8): by this course they are a near-peer, and the AI shifts toward reviewer.

**What this course uniquely teaches:**

- **CRDTs / OT** — conflict-free collaborative editing from first principles, then with a real library
- **Distributed consistency** — convergence, causality, intention preservation, offline merge
- **Presence** — cursors, selections, awareness, at real-time fidelity
- **Rich structured documents** — block-based, nested, a real editor (ProseMirror), not a textarea

**Signature teaching arc:** convergence is *earned three times*. First a **toy CRDT built from scratch** (`packages/crdt-101`, S6) so the learner understands sequence CRDTs (RGA/Logoot-style) in the bones — with a convergence fuzzer. Then the honest reckoning: a hand-rolled CRDT for rich text is a research project, so S7 **adopts Yjs** with a custom transport — *knowing exactly what it does because they built a toy one*. The lesson that crowns the whole curriculum: **build it once badly to understand it, then adopt the real thing knowingly** (the pattern seeded in every prior course's framework debates).

> Functional clone of the Notion/collaborative-editor category (block documents, real-time multiplayer, comments, permissions) — no branding or assets. Product name: **Folio**.

## 2. Product Overview

**Personas:** Editor · Commenter · Viewer (permission tiers) · the *concurrent collaborators* (the whole point).

**Core domains:** workspaces & document tree → the block-based rich-text editor → real-time collaboration (CRDT sync, presence) → offline editing & merge → comments & suggestions anchored to content → permissions & sharing → version history → search.

## 3. Tech Stack

| Layer | Choice | Teaching rationale |
|---|---|---|
| Language / repo | TypeScript strict · pnpm + Turborepo | carried |
| Frontend | React 19 + Vite SPA (local-first, 🔗 Tracer) | the editor is the app |
| Editor | **ProseMirror** (schema-based rich text) | a real editor with a real document model; contenteditable is a swamp we don't hand-roll |
| CRDT (learning) | **`packages/crdt-101`** — hand-built sequence CRDT + fuzzer | understand before you adopt |
| CRDT (production) | **Yjs** + `y-prosemirror`, **custom WebSocket provider** | the real thing, driven knowingly |
| Transport | `ws` gateway + Redis pub/sub (🔗 Tracer sync spine) | multi-instance awareness + updates |
| Persistence | PostgreSQL + Prisma; Yjs update log + periodic snapshots; S3-compatible for large snapshots | the storage model for CRDT documents |
| Offline | IndexedDB (y-indexeddb + custom) | offline-first editing, real merge |
| Auth/permissions | sessions + document-tree ACL inheritance | carried; ACL is new |
| Testing | Vitest · Playwright (multi-context editing) · **convergence fuzzers** (crdt-101 and Yjs transport) | |
| CI/CD, deploy, observability | carried; sync-lag + document-load metrics | |

**Layout:** `apps/{web,api}` (+ ws gateway), `packages/{crdt-101,editor,sync,db,shared,config}`, `docs/{adr,curriculum,sprints,runbooks,audits}`.

## 4. Curriculum deltas (capstone)

1. **Learner co-authors every sprint** (not just S8): the AI proposes the design and reviews; the learner writes a substantial share of the implementation. The teaching artifact shifts from "read the senior's code" to "senior reviews your code."
2. **Understand-then-adopt is explicit:** S6 builds a toy CRDT; S7 adopts Yjs; the ADR compares them with the learner's own toy as the baseline. This is the curriculum's thesis sprint.
3. **Convergence is sacred:** fuzzers from S6 onward; any change that can break convergence is gated.
4. **Depth over breadth:** fewer features than prior courses, each explored deeper. This is a capstone, not a checklist.

### Competency additions

| Competency | Taught in |
|---|---|
| Rich-text/document data models (ProseMirror schema) | S3 |
| Sequence CRDTs from scratch (RGA/Logoot) | S6 |
| Causality, vector clocks, intention preservation | S6, S7 |
| Production CRDT integration (Yjs) + custom provider | S7 |
| Offline merge & snapshot/compaction | S8, S10 |
| Anchored collaborative comments/suggestions | S9 |
| ACL inheritance in a tree | S11 |
| Version history over an update log | S10 |
| Convergence fuzzing & distributed testing | S6, S7, S13 |

## 5. Domain Model (reference)

```
Workspace ─┬─ Member (role)
           ├─ Node (document tree: doc | folder; parent, order) ─┬─ ACL (inherited + overrides)
           │                                                     ├─ DocState (Yjs update log + snapshots)
           │                                                     ├─ Comment/Suggestion (anchored to a relative position)
           │                                                     └─ VersionSnapshot (named/auto, from the update log)
           ├─ Presence (ephemeral: cursor, selection, user — Redis only)
           └─ ShareLink (public/permissioned)
```

## 6. Sprint map

| # | Sprint | Phase | Size | Headline |
|---|---|---|---|---|
| 1 | Foundation & skeleton (doc load/save, WS echo) | MVP | S | Fast-forward; SPA + ws; ADR: the CRDT roadmap |
| 2 | Workspaces, document tree & permissions v1 | MVP | M | Tree model, ACL basics |
| 3 | The block editor (single-user) | MVP | L | ProseMirror schema, blocks, slash menu |
| 4 | Editor depth: nesting, media, keyboard | MVP | L | Nested blocks, DnD, keyboard-first |
| 5 | Naive real-time (last-write-wins) → `v0.5.0` | MVP | M/L | Deliberately broken multiplayer; feel the need for CRDTs |
| 6 | crdt-101: build a sequence CRDT from scratch | Full | L | RGA/Logoot, convergence fuzzer (learner-led) |
| 7 | Adopt Yjs + custom provider (flagship) | Full | XL | Understand-then-adopt; y-prosemirror, WS provider |
| 8 | Offline-first & merge (dialogue) | Full | L | IndexedDB, offline edits, reconnect merge |
| 9 | Presence, comments & suggestions | Full | L | Awareness, anchored comments, relative positions |
| 10 | Persistence, snapshots & version history | Full | L | Update-log compaction, snapshots, time travel |
| 11 | Permissions v2: ACL inheritance & sharing | Full | M/L | Tree ACL, share links, per-block? |
| 12 | Performance: large docs & many cursors | Full | L | Virtualized rendering, update batching, budgets |
| 13 | Hardening: convergence chaos & security | Full | L | Audit; malformed updates, ACL on the wire |
| 14 | Search, export & polish | Full | M/L | Cross-doc search, export, a11y |
| 15 | Production readiness → `v1.0.0` | Full | L | Sync/doc observability, split-brain drill, runbooks |

## 7. Open questions (decide before Sprint 1)

1. Yjs confirmed over Automerge for production? (Spec assumes Yjs for perf + ProseMirror binding maturity.)
2. How much editor scope — tables, embeds, databases? (Spec keeps to rich text + nested blocks + media; Notion "databases" explicitly out.)
3. Learner authorship share target (spec assumes ~50%+ from S3 on).
