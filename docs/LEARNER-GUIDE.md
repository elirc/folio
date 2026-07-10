# Learner Guide — How to Study Folio (the Capstone)

Welcome to the capstone. **Folio is a course disguised as a codebase** — a from-scratch build of a
Notion-class collaborative document editor (block-based rich text, real-time multiplayer, offline merge,
comments, permissions, version history), delivered as 15 pull requests. But this course is different from
the five before it, and the difference is you.

This is **Course 6**, and its subject is the hardest thing in product engineering: **real-time
collaborative editing** — CRDTs, distributed consistency, presence, and a real rich-text document model.
It's taken *last on purpose*: every prior course's lessons converge here.

---

## What's different: you co-author

In the earlier courses you mostly *read* a senior's PRs. Here, **you write a substantial share of the
code** from Sprint 3 on, and the AI shifts toward **reviewer**. The teaching artifact flips: from "study
the senior's implementation" to "the senior reviews yours." A commit tagged `[L]` is yours; `[A]` is the
AI's. The AI proposes the design and reviews your work; you build it. By this course you're a near-peer —
act like one.

So the three active moves from earlier courses gain a fourth:
1. **Predict** before reading the design.
2. **Review** the diff yourself before reading the placed comments.
3. **Do the lab.**
4. **Author.** Write the `[L]` commits. The AI's review of your code — its questions, its "here's what a
   senior catches" — is the most valuable thing in the repo.

---

## The thesis: earn the abstraction three times

The signature arc of the whole curriculum lands here, stated as a roadmap in **ADR-0002** (read it first):

- **Sprint 5 — build multiplayer WRONG on purpose.** Naive last-write-wins. It *will* lose data and feel
  broken, and that's the point: you must feel the need before you understand the fix.
- **Sprint 6 — build a toy CRDT from scratch** (`packages/crdt-101`, a sequence CRDT, RGA/Logoot-style)
  with a convergence fuzzer. Now you understand sequence CRDTs *in the bones* — causality, intention
  preservation, convergence.
- **Sprint 7 — adopt Yjs, knowingly** (the flagship). A hand-rolled CRDT for rich text is a research
  project, so you adopt the real one — *understanding exactly what it does because you built a toy one*.

This is the curriculum's crowning lesson, rehearsed in miniature in every prior course's framework debate
(XState, Temporal, vector DBs): **build it once badly to understand it, then adopt the real thing
knowingly.** *Don't design for an abstraction you don't yet understand — earn it first.*

---

## Convergence is sacred

From Sprint 6 on, **convergence fuzzers** guard the sync layer: property tests that hammer the CRDT/
transport with concurrent, reordered, dropped, and duplicated operations and assert everyone ends up in
the same state. Any change that can break convergence is gated. When you author sync code, the fuzzer is
your judge — a green fuzzer is the definition of "correct" here, not a hope.

---

## Depth over breadth

This is a capstone, not a checklist. There are **fewer features** than the earlier courses, each explored
deeper. Notion "databases" are explicitly out of scope; the editor is rich text + nested blocks + media.
Don't rush to the next feature — the value is in understanding one hard thing completely.

---

## How to read a single PR

Follow the **"How to review this PR"** section's file order (usually: schema → sync/CRDT → editor →
tests → docs). Watch for:
- **Teaching comments** — `📘 concept` · `🔍 review-lens` · `⚠️ pitfall` · `🔗 connects`.
- **`[L]` / `[A]` commit tags** — your work vs. the AI's; the AI's review comments on your `[L]` commits
  are the payoff.
- **The convergence fuzzer** — from S6, the real spec of the sync layer.
- **The planted debate** — each PR argues a real decision (CRDT-from-start vs. plaintext, Yjs vs.
  Automerge, OT vs. CRDT) with a resolution. Read the losing side charitably.
- **The ADRs** — especially ADR-0002, the roadmap that frames all 15 sprints.

---

## Where things live

- `SPEC.md` — product spec, tech stack, competency additions
- `docs/sprints/README.md` — the sprint index and cross-sprint arcs
- `docs/sprints/00-workflow.md` — the ritual every sprint follows
- `docs/sprints/sprint-NN.md` — the per-sprint playbook
- `docs/adr/` — architecture decisions (ADR-0002 is the roadmap; read it first)
- `docs/curriculum/sprint-NN.md` — objectives + exercise questions, added as each sprint merges

Start at `docs/adr/0002-*` — the CRDT roadmap — then the Sprint 01 PR. Predict first, then author.
