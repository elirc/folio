# ADR-0007 — What we learned building a CRDT, and why we won't ship this one

**Status:** accepted (S06) · **Relates to:** ADR-0002 (the roadmap), ADR-0006 (the LWW failure this fixes)

## Context

We built `crdt-101`: a real, from-scratch sequence CRDT (RGA) for plain text, with a convergence fuzzer and
the tombstone bug caught-and-fixed inside one PR. It converges under 300 randomized concurrent interleavings.
So: do we build our own CRDT for Folio, or adopt a library (Yjs/Automerge)?

## What building it taught us (the point of the sprint)

These are now *earned* understandings, not memorized facts:

1. **Identity, not position.** Every element is a globally-unique, immutable id — never an offset. This one
   substitution is *why* concurrent edits merge (and *why* S05's positional LWW could not). It is also why
   cursors (S05) and comment anchors (S09) must be *relative to identities*, not absolute offsets.
2. **You cannot delete — you tombstone.** A concurrent op may still reference a "deleted" element as its
   origin. Hard delete diverges (the fuzzer found it in ~30 runs); a tombstone keeps the identity as a
   permanent anchor. This is the single most common CRDT beginner bug, and we felt it.
3. **Logical time, not wall-clock.** A Lamport clock + site id gives a total, deterministic order that
   every replica computes identically. Wall clocks skew and tie; they cannot order concurrent events.
4. **Convergence is a property, provable only by fuzzing.** Examples pass while the algorithm is still
   wrong. The randomized interleaving fuzzer is the only thing that finds the violations — it is the most
   valuable artifact we built, and it stays alive for every future collaboration sprint.

## Decision — adopt **Yjs** for Folio; freeze crdt-101 as a teaching artifact

| | crdt-101 (ours) | Yjs (adopt) |
|--|-----------------|-------------|
| Plain text convergence | ✅ (fuzzed) | ✅ (battle-tested a decade) |
| **Rich text** (blocks, marks, nested ProseMirror) | ❌ research-grade, years of work | ✅ `y-prosemirror` binding |
| Performance (large docs, GC of tombstones) | ❌ O(n) scans, unbounded tombstones | ✅ optimized structs, delete-set compaction |
| Offline / persistence / awareness | ❌ we'd build all of it | ✅ y-indexeddb, update log, y-protocols |
| Correctness we can trust | our fuzzer's word | a decade of production + their fuzzers |

**We adopt Yjs (S07).** Rich-text CRDTs — ordering blocks *and* marks *and* nested structure while staying
fast — are genuinely research-grade; shipping our own would mean re-discovering bugs Yjs solved years ago.

**And this decision is only trustworthy because we built crdt-101 first.** We will read Yjs's docs, and bind
it to ProseMirror in S07, as *peers who built the toy* — we know what "originLeft," "tombstone," and
"logical clock" mean because we implemented them and fuzzed them to convergence. Adoption without that
understanding would be cargo-culting; with it, it's an engineering decision.

## The thesis, at full strength

**Build it once badly to understand it, then adopt the real thing knowingly.** This is the spine of the
entire six-course curriculum, and the capstone states it here at full volume: we earned convergence by hand
(S06) precisely so that adopting Yjs (S07) is a *choice we can defend*, not a prayer we recite.

## Consequences

- `crdt-101` is **frozen** after this sprint — kept in the repo as a reference/teaching tool, not evolved.
- The convergence fuzzer's *shape* carries into S07/S13: we fuzz the Yjs-backed transport for convergence too.
- S07 adopts Yjs + y-prosemirror, replaces the whole-doc LWW model, and **flips S05's damning test green.**
