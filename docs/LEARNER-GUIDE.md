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
  are the payoff. Note: each sprint was **squash-merged**, so `git log` on `main` shows one commit per
  sprint and no tags. The tagged commits live on the PR: sprint N is PR #5N (S07 = #35), e.g.
  `gh pr view 35 --repo elirc/folio --json commits -q '.commits[].messageHeadline'`.
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

- `docs/sprints/flaw-ledger.md` — the five planted flaws (author-private until the S13 recap)
- `COURSE-RETROSPECTIVE.md` (repo root) and `docs/curriculum/RETROSPECTIVE.md` — the course, and the
  six-course arc, revealed
- `docs/sync-protocol.md`, `docs/latency-budget.md`, `docs/perf-audit.md`, `docs/threat-model.md`,
  `docs/audits/sprint-13-audit.md`, `docs/postmortems/split-brain-drill.md`, `docs/runbooks/sync-operations.md`
  — the reference docs the later sprints produced

Start at `docs/adr/0002-*` — the CRDT roadmap — then the Sprint 01 PR. Predict first, then author.

---

## After the course: a study path through the reference docs

The sprint PRs teach in order; these docs are where the course's claims are *stated*. Reading them
passively wastes them. For each one, the method is the same: **find the code or test that backs every
claim, and notice the claims that have no backing.** (All checks below are static — `grep` and reading; no
install needed. Verified against `main` @ `af51546`, 2026-10-06.)

1. **`COURSE-RETROSPECTIVE.md` — method: rebuild the flaw table from code.** Cover the "Harvested" column
   and, for each of the five flaws, find the test that pins the fix.
   **Check:** you land on `packages/editor/src/naiveSync.test.ts` (flaw 1, the S05 damning test),
   `packages/collab/src/anchor-drift.test.ts` (flaw 3), `packages/collab/src/history.test.ts` (flaw 4), and
   `apps/api/src/yroom.test.ts` "a user DEMOTED mid-session can no longer edit on their open socket" (flaw 5).
2. **`docs/sync-protocol.md` — method: trace one message end to end.** Follow an `update` from
   `apps/api/src/ws.ts` (`ws.on("message")` → `rooms.handle`) into `YRooms.handle` in `apps/api/src/yroom.ts`.
   **Check:** you can say which message types count as *mutating* (`sync2`, `update`), which is always
   allowed (`sync1`), and what happens to a malformed update (the `try/catch` "quarantine" — dropped, room
   survives). Then read `packages/collab/src/provider.test.ts` and explain the reconnect gap in one sentence.
3. **`docs/latency-budget.md` + `docs/perf-audit.md` — method: separate the structural claim from the
   wall-clock one.** Read `packages/collab/src/budget.perf.test.ts` and `packages/collab/src/loadgen.ts`
   (`bigDoc`, `simulateCursors`).
   **Check:** you can point to the assertion that bounds *update size* (independent of document size) vs. the
   one that times 20 keystrokes, and explain why only the first would catch a regression back to S05's
   whole-document model on a fast machine. CI runs it as `pnpm turbo run perf:budget` (`.github/workflows/ci.yml`).
4. **`docs/threat-model.md` — method: for each mitigation, find the *caller*, not just the function.**
   **Check:** run `grep -rn "safeApplyUpdate\|verifyUpdateAuthorship\|setCanEdit" apps packages`. You should
   find that `safeApplyUpdate` and `verifyUpdateAuthorship` (`packages/collab/src/security.ts`) are called only
   from `security.test.ts`, and `rooms.setCanEdit` only from `yroom.test.ts` — no ACL route calls it. Also
   note `ws.ts` passes `canEdit = true` when the `member` query param is absent. Write down which of T2–T4 are
   enforced on the live server path and which are tested helpers awaiting wiring — this is the
   "security claims vs. protections that exist" skill, and it is the real residual risk list.
5. **`docs/audits/sprint-13-audit.md` — method: audit-first ranking.** Before reading the P1/P2/P3 sections,
   list the risks you'd expect for a WebSocket editor and rank them yourself.
   **Check:** compare your ranking with the audit's; for each P1 you missed, name the test that now pins it
   (`yroom.test.ts`, `security.test.ts`, `chaos.convergence.test.ts`).
6. **`docs/postmortems/split-brain-drill.md` + `docs/runbooks/sync-operations.md` — method: know what the
   drill actually simulates.** Read `packages/collab/src/splitbrain.convergence.test.ts`.
   **Check:** you can explain that the "partition" is two in-process `Y.Doc` replicas exchanging state — it
   proves the CRDT merge and `convergenceHealth` (`packages/collab/src/health.ts`), not a real network or
   multi-instance fan-out (Redis is in `packages/db/docker-compose.yml`, but no code publishes to it; see the
   comment in `apps/api/src/yroom.ts`). Then pick one runbook entry and say which test or metric would tell
   you it applies.

Suite size for reference: 195 `it(`/`test(` cases across 45 `*.test.ts` files (static count, 2026-10-06);
the fuzzers are `fast-check` properties (`numRuns` 300 in crdt-101, 150 offline, 200 chaos).
