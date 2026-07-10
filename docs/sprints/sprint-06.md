# Sprint 06 — crdt-101: Build a Sequence CRDT From Scratch (Learner-Led)

**Branch:** `sprint-06/crdt-101` · **Size:** L · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** Understand CRDTs in the bones by building one. A `packages/crdt-101` sequence CRDT (RGA/Logoot-style) for *plain text*, with a convergence fuzzer, wired into a toy collaborative plaintext pane. Heavily learner-led with AI reference for the genuinely hard parts. This is not the production system (S7 adopts Yjs) — it's the sprint that makes S7's adoption *knowing* instead of cargo-cult.

## A — Issues
1. `crdt-101: a sequence CRDT — unique element ids, ordering, insert/delete, tombstones`
2. `Convergence fuzzer: random concurrent op interleavings must reach identical state`
3. `Causality: logical clocks / operation ordering`
4. `Toy integration: two panes sharing a crdt-101 text buffer converge`

## B — Commits
| # | Commit | Notes |
|---|--------|------|
| 1 | `[A] feat(crdt-101): the core algorithm scaffolding — element identity, between-ordering, apply` | AI writes the reference core (RGA-style: each char has a unique id + a "left origin"); the learner studies the hardest 60 lines in the course |
| 2 | `[L] feat(crdt-101): insert operation — generate id, find position, link` | learner implements against the scaffolding |
| 3 | `[L] feat(crdt-101): delete via tombstones` | **[in-PR arc]** first version hard-deletes; a concurrent insert next to a deleted char misbehaves |
| 4 | `[L] test(crdt-101): convergence fuzzer — N clients, random ops, partition, merge, assert equal` | the learner writes the fuzzer (the single most valuable thing they build this sprint) |
| 5 | `[A] test(crdt-101): fuzzer finds the tombstone bug — deleted-then-concurrently-adjacent char resurrects, FAILS` | the fuzzer earns its existence immediately |
| 6 | `[L] fix(crdt-101): proper tombstones + interleaving rules` | learner fixes with AI guidance; convergence holds |
| 7 | `[L] feat(crdt-101): logical clock / causal ordering for ops` | |
| 8 | `[L] feat(web): toy plaintext collab pane on crdt-101 (two windows converge, no clobber)` | the S5 pain, *gone*, in a toy — the emotional payoff |
| 9 | `[A] docs: ADR-0006 — what we learned building a CRDT (and why we won't ship this one); curriculum note` | the honest ADR: our toy works for plaintext but rich text (blocks, marks, ProseMirror) is a research-grade problem — setting up S7 |

## C — Review order
The core algorithm (1, AI ref — study it hard) → insert/delete (2–3, L) → **the fuzzer (4, L) and the bug it caught (5→6)** → the toy pane (8).

## D — Teaching comments (~12, mostly review feedback on L commits)
- element identity — 📘 the CRDT keystone: every character is a globally-unique, immutable identity, not a position; positions shift, identities don't — this is why concurrent edits can merge (contrast S5's positional LWW)
- between-ordering — 📘 how RGA/Logoot order elements without central coordination; the "insert between A and B" operation that needs no lock
- tombstones — ⚠️ you can't actually delete in a CRDT (a concurrent op might reference the deleted element); you tombstone; the fuzzer-caught bug (5) is the classic resurrection — read commits 5→6 as the definitive tombstone lesson
- the fuzzer — 🔍 review-lens (on L's commit 4): this is the most important test in the course; convergence is a property (any interleaving → same state), and only randomized interleaving fuzzing finds the violations examples miss — 🔗 the learner has built convergence fuzzers before (Tracer S7, Pulse chaos); here they build the canonical one
- causality — 📘 logical clocks order operations without wall-clock trust (🔗 the LWW-timestamp lesson from Tracer, now foundational); happens-before as the real ordering
- "won't ship this one" — 📘 the capstone's crowning honesty: we built it, it works for text, and rich-text CRDTs are genuinely research-grade — so S7 adopts Yjs; but now we'll read Yjs's docs as *peers who built the toy*, not as cargo-culters

## E — Debate
**"Ship crdt-101 (our own) vs adopt a library (Yjs/Automerge)?"** Ours: full control, we understand every line — but rich text (blocks, marks, nested structure, performance) is years of work and we'd ship bugs Yjs solved a decade ago. Library: production-grade, ProseMirror bindings exist, huge investment behind it. **Resolution:** adopt Yjs in S7 — *and this decision is only trustworthy because we built crdt-101 first*. The ADR compares Yjs's approach to our toy point by point. Lesson: **build it once badly to understand it, then adopt the real thing knowingly** — the thesis of the entire six-course curriculum, finally stated at full strength.

## F/G — Close
- Squash: `feat(sprint-06): crdt-101 — a sequence CRDT from scratch (closes #…)`
- Deferred: none — crdt-101 is a learning artifact, frozen after this sprint (kept in the repo as a reference/teaching tool).
- Recap idea: *you now understand CRDTs because you built one and fuzzed it to convergence — that understanding is the only thing that makes adopting Yjs an engineering decision instead of a prayer.*
