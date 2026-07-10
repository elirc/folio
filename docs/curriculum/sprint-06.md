# Curriculum Note — Sprint 6: crdt-101 (Build a Sequence CRDT From Scratch)

## Learning objectives
- Understand CRDTs *in the bones* by building one — identity, ordering, tombstones, logical time.
- Write the **convergence fuzzer** (the single most valuable artifact of the sprint) and watch it earn its
  keep by catching the tombstone bug.
- Internalize the capstone thesis at full strength: **build it once badly to understand it, then adopt the
  real thing knowingly.**

## Key concepts
- **Identity, not position (the keystone).** Every element is a globally-unique, immutable id — never an
  offset. That one substitution is *why* concurrent edits merge, and why S05's positional LWW could not.
  It's also why cursors (S05) and comment anchors (S09) must be relative to identities, not absolute offsets.
- **Between-ordering without a lock.** RGA orders concurrent same-origin inserts deterministically by id
  (higher id closer to origin), using only immutable data — so every replica computes the identical order.
  No central coordinator, no lock.
- **You cannot delete — you tombstone.** ⚠️ A concurrent op may still reference a "deleted" element as its
  origin. Hard delete *diverges* (the fuzzer found it in ~30 runs; the resurrection test pins it). A
  tombstone keeps the identity as a permanent anchor. Read commits 2→3→4→5 as the definitive tombstone
  lesson: broken delete → fuzzer catches → pinned → fixed.
- **Logical time, not wall-clock.** A Lamport clock + site id gives a total, deterministic order every
  replica agrees on. 🔗 The LWW-timestamp lesson from earlier courses, now load-bearing: happens-before is
  the real ordering; wall clocks skew and tie.
- **Convergence is a property, provable only by fuzzing.** Examples pass while the algorithm is still wrong.
  Only randomized interleaving finds the violations. 🔗 You've built convergence fuzzers before; this is the
  canonical one, and it is **sacred** — every later collaboration sprint keeps a fuzzer alive.
- **Why we won't ship it (the crowning honesty).** crdt-101 works for plaintext. Rich text — blocks, marks,
  nested ProseMirror, performance, GC of tombstones — is research-grade. So S07 adopts **Yjs**. But we now
  read Yjs's docs as *peers who built the toy*, not cargo-culters. Adoption is trustworthy **only because we
  built this first.**

## The in-PR arc (read the commits in order)
1. `[A]` core (identity, clock, insert integration) → 2. `[L]` **hard delete** (looks done) → 3. `[L]` the
**fuzzer** (fails ~30 runs) → 4. `[A]` **pin the bug** (deterministic reproduction, fails) → 5. `[L]` **fix:
tombstones** (all green). The bug was planted and harvested *inside one PR by design* — that's the whole
lesson in five commits.

## ⚗️ Lab
Open the **🧪 crdt-101 lab** in the app. Disconnect the two panes, type different words in each, reconnect.
They converge and keep both edits. That is the S05 pain — gone — in the toy you built. Compare how it *felt*
to lose a paragraph in S05 vs. how this feels.

## The debate, cashed
**Ship our own CRDT vs. adopt a library?** Resolved: **adopt Yjs (S07)** — rich text is research-grade — *and
this is only trustworthy because we built crdt-101 first.* **Build it once badly to understand it, then
adopt the real thing knowingly.**

## Exercise questions
1. Explain, using an example, why hard delete diverges but tombstoning converges. What role does the
   element's *id* play as an anchor?
2. Why can't wall-clock timestamps order concurrent operations? What does the Lamport clock give you instead?
3. Run the fuzzer with `numRuns` lowered to 5, then raised to 2000. What does that tell you about the
   relationship between test effort and confidence in a *property*?
4. Read the Yjs README now. Name three things Yjs gives you that crdt-101 does not — and, for each, whether
   you now *understand* it because you built the toy.

## Further reading
- Martin Kleppmann, "CRDTs: The Hard Parts" (talk) · "A comprehensive study of CRDTs" (Shapiro et al.) ·
  the RGA & Logoot papers · Yjs internals / YATA (coming S07) · ADR-0007 (this sprint's decision)
