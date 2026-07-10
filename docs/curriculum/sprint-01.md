# Curriculum Note — Sprint 1: Foundation (doc skeleton + WS echo)

## Learning objectives
- Stand up the capstone's walking skeleton: load/save a document and a real WebSocket transport.
- Internalize the **roadmap** (ADR-0002) that frames all 15 sprints.
- Practice the capstone's mindset: **don't design for an abstraction you haven't earned yet.**

## Key concepts
- **The roadmap is the point (ADR-0002).** We will build multiplayer *wrong* (S05 last-write-wins), then
  build a *toy CRDT* to feel why it's hard (S06), then adopt the *real* one (Yjs) understanding every part
  (S07). The throwaway naive version is a **teaching investment, not waste** — 🔗 the "build-once-badly-
  then-adopt" pattern every prior course rehearsed in miniature (XState, Temporal, vector DBs) is the
  capstone's whole spine. Read ADR-0002 before anything else.
- **Build the pipes before the hard part.** The WebSocket is an *echo* in S01. That's deliberate: the
  transport (connect/send/receive) is real and boring now, so when the hard content flows through it (naive
  sync in S05, Yjs updates in S07) it plugs into a connection that already works.
- **Name for the future, not the present.** It's `DocState.text`, not `Node.content`. Today it's a
  plaintext string; by S07 it's a Yjs update log + snapshots. Naming it `DocState` leaves room to grow
  without a rename — a small choice that avoids boxing yourself into "the document is a string," which is
  precisely the assumption the capstone dismantles.
- **An honest placeholder.** The "editor" is a textarea, and we *say so* in the UI. A textarea is not the
  editor (ProseMirror arrives S3); it exists so save/load/ws are real before the editor's complexity lands.
  Honest placeholders beat fake progress.
- **The learner co-authors now.** Five courses in, monorepo scaffolding is muscle memory — most of S01 is
  `[L]` (learner-authored), and the AI's review is light, noting only what's *different* here (the ws in the
  skeleton). From here on, you write; the AI reviews.

## The debate, cashed
**Store documents as plaintext now vs. design for CRDT from the start?** Resolved: plaintext now; the
naive→toy→Yjs migrations are curriculum, not accidents. *Don't design for an abstraction you don't yet
understand — earn it first.*

## Exercise questions
1. Why is it worth shipping an *intentionally broken* multiplayer in S05 instead of skipping to Yjs? What
   can't you learn any other way?
2. Why name the model `DocState` instead of putting a `content` string on `Node`? What future does the name
   protect?
3. The WS is an echo in S01. Trace what this exact gateway becomes in S05 and S07 — why build the pipe first?
4. Read ADR-0002. For each of the three phases (naive, toy, Yjs), name what it teaches and what it throws away.

## Further reading
- CRDTs vs. OT (a first orientation) · Local-first software (Ink & Switch) · ProseMirror (coming in S3) ·
  Yjs (coming in S7) · "Build one to throw away" (Fred Brooks)
