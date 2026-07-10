# Sprint 07 — Adopt Yjs + Custom Provider (Flagship)

**Branch:** `sprint-07/yjs-adoption` · **Size:** XL · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** The capstone's flagship and the curriculum's thesis in action: adopt Yjs for production CRDT, bind it to ProseMirror via `y-prosemirror`, and build a **custom WebSocket provider** (not the off-the-shelf one) so the learner understands the transport layer they depend on. The S5 damning test flips to green. The learner reads Yjs as a peer who built crdt-101.

## A — Issues
1. `Yjs integration: Y.Doc as document state, y-prosemirror binding`
2. `Custom WS provider: sync protocol (step1/step2), update propagation, awareness`
3. `Server: Yjs update log persistence, Redis fanout across instances`
4. `Migration: existing ProseMirror-JSON docs → Yjs docs`

## B — Commits (three acts)
### Act 1 — Bind
| # | Commit | Notes |
|---|--------|------|
| 1 | `[A] feat(sync): Y.Doc + y-prosemirror binding — the editor edits a CRDT now` | AI writes the binding (deep integration); the learner studies how PM transactions become Yjs updates — *exactly the steps they hand-crafted in crdt-101, now industrial* |
| 2 | `[L] feat(db): DocState becomes a Yjs update log + snapshot columns (migration from PM-JSON)` | data migration: load old JSON → seed a Y.Doc → store its update; the learner runs the expand/backfill playbook they've done four times |
| 3 | `[L] feat(editor): block ids via Yjs (harvest flaw #2 — collision-proof ids)` | **harvests flaw #2**, ledger quoted: Yjs-managed identity replaces the S3 client-random scheme; collision test |

### Act 2 — The custom provider
| # | Commit | Notes |
|---|--------|------|
| 4 | `[A] feat(sync): custom WS provider — the Yjs sync protocol (SV exchange, step1/step2, update relay)` | AI reference for the protocol core; the learner studies why it's shaped like this (it's crdt-101's merge, generalized) |
| 5 | `[L] feat(sync): provider client — connect, sync, apply remote updates, buffer local while offline` | learner builds the client half against the AI's protocol core |
| 6 | `[L] feat(api): server — receive updates, append to log, Redis-fanout to other instances` | 🔗 the Tracer sync-spine pattern (log + pub/sub), now carrying CRDT updates |
| 7 | `[A] test(sync): the S5 damning two-client test → NOW GREEN` | **the flagship moment:** the test that documented data loss in S5 now shows convergence; the diff between S5 and S7 test output is the whole arc |
| 8 | `[L] test(sync): provider reconnect — [in-PR arc] updates during the sync gap are dropped, FAILS → fix (sync-then-attach ordering)` | 🔗 the exact bootstrap-gap race from Tracer S6, CRDT-shaped; the learner recognizes it |

### Act 3 — Awareness & harden
| # | Commit | Notes |
|---|--------|------|
| 9 | `[L] feat(sync): awareness protocol — presence/cursors over the provider (ephemeral, not in the doc)` | 🔗 durable-vs-ephemeral: awareness is Yjs's ephemeral channel; cursors never enter the update log |
| 10 | `[L] test(fuzz): convergence fuzzer against the Yjs transport (adapt the crdt-101 fuzzer)` | the learner's own fuzzer, re-aimed at the real system |
| 11 | `[A] docs: ADR-0007 — Yjs adoption, with crdt-101 as the comparison baseline; sync protocol doc; curriculum note` | the ADR reads as a *knowledgeable* evaluation because the learner built the toy |

## C — Review order
The y-prosemirror binding (1, study it against crdt-101) → the custom provider protocol (4) → **the S5 test going green (7)** → the reconnect-gap arc (8) → awareness (9).

## D — Teaching comments (~14)
- Yjs = crdt-101 grown up — 📘 the payoff of S6: Yjs's updates *are* the operations you built by hand; y-prosemirror maps PM transactions to those ops; you're reading familiar ideas at production scale — this is what "adopt knowingly" feels like
- custom provider not y-websocket — 🔍 review-lens: we build our own provider (Yjs ships one) precisely so the learner owns the transport; the off-the-shelf provider is a black box, and this course's whole thesis is against black boxes you depend on
- the sync protocol — 📘 state-vector exchange → diff → update relay; it's crdt-101's "merge two replicas" as a wire protocol; why it's efficient (send only what the peer lacks)
- **S5 test green (7)** — 📘 stop and feel this: the same two-client concurrent edit that destroyed a paragraph in S5 now converges; two sprints of understanding, one flipped assertion; this is the capstone's emotional core
- reconnect gap — 🔗 the learner should *recognize* this from Tracer S6 (bootstrap gap) — the fix (sync fully, then attach the live listener) is the same shape; cross-course pattern mastery
- awareness ephemeral — 🔗 cursors/presence in the awareness protocol, never the doc log — the durable-vs-ephemeral split, fourth appearance, now reflexive
- update log + snapshots — 🔗 the storage model (append updates, periodic snapshot) foreshadows S10's compaction (flaw #4)
- learner-as-peer — 📘 the AI's review of the learner's provider client (5) and server (6) is the teaching artifact — a senior reviewing a near-peer's implementation of a hard system

## E — Debate
**"Yjs vs Automerge vs keep building crdt-101?"** crdt-101: understood but plaintext-only, years from rich-text-ready. Automerge: elegant, JSON-native, historically heavier for large text. Yjs: battle-tested, fast, mature ProseMirror bindings, the awareness protocol. **Resolution:** Yjs — the ADR justifies it with our crdt-101 as the honest baseline ("here's what we'd have to build; here's what Yjs already solved: performance, rich text, GC of tombstones, bindings"). Lesson: *the framework debate every prior course rehearsed (XState, Temporal, ClickHouse, vector DBs) reaches its final form here — and you can only make this call well because you built the toy version first.*

## F/G — Close
- Squash: `feat(sprint-07): adopt Yjs, custom provider, real multiplayer (closes #…)`
- **Lab:** the learner runs the convergence fuzzer against the live transport with injected network reordering/duplication and confirms convergence holds; then compares Yjs's behavior to their crdt-101 on the same op sequences.
- Ledger: flaw #1 closed (real CRDT replaces LWW); flaw #2 closed (Yjs ids).
- Recap idea: *the paragraph that died in S5 now survives — because you built a CRDT by hand, you adopted the real one with your eyes open.*
