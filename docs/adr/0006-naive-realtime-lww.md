# ADR-0006 — Naive real-time (last-write-wins): why it's broken, and what fixes it

**Status:** accepted *as a deliberate, temporary flaw* (S05) · **Flaw:** #1 (announced) · **Fixed by:** S06 (toy CRDT) → S07 (Yjs)

## Context

We shipped multiplayer. It is **wrong on purpose.** This ADR documents *why* it's wrong, so the flaw is a
recorded engineering decision rather than an accident — and so the reader can feel the problem before
building the fix.

## What we built

On every change, a client serializes its **entire document** and broadcasts it to the room over WebSocket.
A receiving client **replaces its whole document** with the incoming one. Conflict resolution is
**last-write-wins**: the update with the higher revision (ties → later arrival) overwrites everything.

## Why it's broken

**LWW has no concept of *concurrent* changes. It only knows "latest."**

Two people edit at the same time, from the same starting document:
- Alice adds a paragraph → broadcasts her whole doc.
- Bob, concurrently, adds a *different* paragraph → broadcasts his whole doc.
- Bob's update arrives at Alice second. It **replaces** her document. **Alice's paragraph is gone** — no
  error, no conflict marker, no merge. Just silent data loss.

The two edits never merge, because *there is no merge* — only overwrite. `naiveSync.test.ts` reproduces
this and asserts the vanished paragraph. That test is not a mistake; it is the **regression test S07 flips
to green.**

Presence has the same disease. A cursor is an **absolute offset** into a document that's changing
underneath it. `head: 42` meant something in the sender's document a moment ago; after any concurrent edit,
position 42 is different text. Cursors jump and misplace. 🔗 This is the same problem as the S09 comment-
anchoring flaw (#3): **positions must be relative to survive edits.**

## The class of problem (so the fix makes sense)

The root cause: our sync unit is *state* (the whole document), and our merge rule is *pick one*. To merge
concurrent edits we need either:
- **Operational Transformation (OT):** transform each op against concurrent ops. Powerful, but needs a
  central authority to order operations and is notoriously hard to get right.
- **CRDTs:** structure the data so that concurrent operations *commute* — apply in any order, converge to
  the same result, no central arbiter. This is the path (ADR-0002).

We will **earn** the CRDT: build a toy one by hand in S06 (to understand causality, tombstones, and
convergence the hard way), then adopt **Yjs** in S07 knowing exactly what it does for us.

## Why we did NOT "just fix it" with a lock

A per-document edit lock (one editor at a time) would ship today and dodge the data loss. We **refuse** it:
a lock isn't the product (Google Docs doesn't lock), and — more importantly — it would let us *avoid the
lesson*. The whole point of S05 is to feel LWW eat your work so that the CRDT you build next is motivated by
experience, not by a blog post. *Sometimes the right move is to not paper over the hard problem — feel it
fully, then solve it properly.*

## Consequences

- **v0.5.0** ships as an honest MVP: "multiplayer (beta) — concurrent edits are last-write-wins."
- Flaw #1 is recorded (announced) in the ledger; the damning test guards it.
- The room/fan-out framing (rooms.ts, the WS relay, presence) is real and **survives into S07** — only the
  payload semantics (whole-doc LWW → mergeable Yjs updates) change.
