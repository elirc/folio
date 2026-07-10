# Curriculum Note — Sprint 9: Presence, Comments & Suggestions

## Learning objectives
- Solve **anchoring**: make a comment stay attached to its text as everyone edits around it.
- Feel how S06's foundation (every character has an identity) *enables* this feature.
- Recognize absolute-offset thinking as the S05 disease returning — and kill it with relative positions.
- Model tracked changes as a **mark layer** over the CRDT.

## Key concepts
- **Anchoring is THE hard problem.** A comment says "this is about *these words*." As people edit, "these
  words" move. An **absolute offset** (store index 42) points at whatever character now sits at 42 after any
  prior insert — usually the wrong text. 🔗 The exact failure S05's naive cursors had. Flaw #3 is seeded by
  writing absolute anchors first, on purpose.
- **Relative positions = identity, not coordinate.** `Y.RelativePosition` anchors to the CRDT identity of
  the character. 📘 This is the crdt-101 keystone, cashed as a feature: the anchor tracks the *character*,
  not the number, so it holds through concurrent inserts and deletes. **This is only possible because S06/S07
  gave every character a stable name.** Read `anchor.test.ts` — absolute drifts, relative holds, side by side.
- **Suggestions as marks.** A proposed insertion is text with a `suggestion_insert` mark; a proposed deletion
  is text with `suggestion_delete` (struck through, still visible). Accept/reject are ordinary transactions
  that resolve the mark. Modeling tracked changes as marks — not a parallel edit log — means they ride the
  CRDT for free and never desync from the text.
- **The server never interprets the anchor.** It stores an opaque base64 relative position; only the client
  has the Y.Doc to resolve it. The API is a dumb store + thread/resolve.

## Planted debt (ledger — flaw #3 → S13)
The happy path ships. Two edges are the debt: (1) the anchored text **deleted entirely** — a relative
position to gone content can't point at a character; S13 adds a **fuzzy-text fallback**. (2) ranges across
concurrent structural edits. `anchor.test.ts` includes a `[S13 edge]` case proving graceful (non-crashing)
degradation now; S13's anchor-drift fuzzer hunts the rest.

## The debate, cashed
**Anchoring: relative positions vs block-id+offset vs fuzzy text match?** Resolved: relative positions
primary (CRDT-native, precise); S13 adds a fuzzy fallback for fully-deleted anchors. *Anchoring is a
first-class hard problem; the CRDT's stable identities are the tool — but deleted anchors still need a
fallback.*

## ⚗️ Lab
Two users: one comments on a phrase; the other rewrites the surrounding paragraph. Watch the comment stay
put. Then **delete the anchored text entirely** — document where relative positions hold and where the S13
edge bites. That boundary is next sprint's-after-next brief.

## Exercise questions
1. Insert 4 chars before an anchored word. Explain, in terms of identity vs coordinate, why the absolute
   anchor drifts and the relative one doesn't.
2. Why can suggestions be modeled as marks rather than a separate change log? What does riding the CRDT buy?
3. What happens to a relative anchor when its text is fully deleted? Why is a fuzzy fallback needed, and what
   could it get *wrong*?
4. The server stores the anchor but never reads it. Why can only the client resolve it?

## Further reading
- Yjs relative positions (`createRelativePositionFromTypeIndex`) · y-prosemirror cursor/anchor mapping ·
  "Tracked changes" as marks · ADR-0010 (this decision)
