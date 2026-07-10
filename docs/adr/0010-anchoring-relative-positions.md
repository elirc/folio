# ADR-0010 — Comment/selection anchoring via relative positions

**Status:** accepted (S09) · **Depends on:** ADR-0008 (Yjs) · **Flaw:** #3 seeded (deleted-anchor + cross-block edges → S13)

## Context

Presence, comments, and suggestions all need to point at *text*: "this cursor is here," "this comment is
about these words." The hard problem is **anchoring** — as everyone edits, the words move. How does an anchor
follow the text it means?

## The options

| Approach | Within-block edits | Structural edits | Wrong-text risk |
|----------|-------------------|------------------|-----------------|
| **Absolute offset** (flaw #3 seed) | ❌ drifts on any prior insert | ❌ | high — points at whatever now sits at that number |
| Block id + offset | ⚠️ ok across blocks | ❌ breaks on within-block edits | medium |
| Fuzzy text match | ✅ robust to structure | ✅ | can re-anchor to the wrong identical phrase |
| **Yjs relative position** (chosen) | ✅ | ✅ (happy path) | low — tracks CRDT identity |

## Decision — relative positions as primary

An anchor is a `Y.RelativePosition`: it references the **CRDT identity** of the character, not a coordinate.
📘 This is the crdt-101 keystone cashed as a feature — *identity, not position*. Because S06/S07 gave every
character a stable name, an anchor can say "the character with this identity" and follow it through any
concurrent insert or delete elsewhere. Absolute offsets can't: they name a coordinate, and coordinates move.

`anchor.test.ts` shows the contrast side by side: after a concurrent insert before the anchor, the absolute
offset points at the wrong word; the relative position stays on "brown."

Comments store their anchor as an **opaque base64 relative position**; the server never interprets it (only
the client has the Y.Doc to resolve it against). Suggestions are a **mark layer** over the CRDT — a proposed
insert/delete is a mark, provisional until accept/reject turns it into a real transaction — so tracked
changes ride the CRDT and never desync from the text they annotate.

## Deliberate debt (flaw #3 → S13)

The happy path ships here. Two edge cases are the planted debt, harvested in S13:
1. **The anchored text is deleted entirely.** A relative position to gone content resolves to a boundary or
   null — there's no character to point at. S13 adds a **fuzzy-text fallback** ("this comment was about
   'DELETEME'; nearest match is…").
2. **Ranges spanning concurrent structural edits** (a comment across blocks while blocks are reordered) need
   hardening.

Shipping the happy path first and naming the edges is honest scoping — the anchor-drift *fuzzer* (S13) will
hunt these.

## Consequences

- Comments/cursors/suggestions all rest on relative positions; none use absolute offsets (the S05 mistake).
- `Comment.anchor` is client-encoded; the API is a dumb store + thread/resolve.
- Deferred: mention notifications delivery, comment-drift fuzzer (S13), fuzzy fallback (S13).

*Lesson: anchoring in a collaborative document is a first-class hard problem. The CRDT's stable identities
are the tool — but a fully deleted anchor still needs a fallback story.*
