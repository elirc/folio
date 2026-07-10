import * as Y from "yjs";
import { toB64, fromB64 } from "./protocol";

/**
 * Comment/selection anchoring (S09) — the sprint's hard problem. A comment says "this is about *these
 * words*." As everyone edits around them, "these words" move. How does the anchor follow?
 *
 * 📘 TWO APPROACHES, ONE RIGHT.
 *  - ABSOLUTE OFFSET (flaw #3 seed): store the character index, e.g. 42. The instant anyone inserts text
 *    before position 42, the anchor points at whatever character now sits at 42 — usually the WRONG text.
 *    This is the exact disease S05's naive cursors had. It "works" until a concurrent edit, then drifts.
 *  - RELATIVE POSITION (the fix): `Y.RelativePosition` anchors to the CRDT *identity* of the character — the
 *    crdt-101 keystone (identity, not position!). The anchor tracks the character itself, so inserts and
 *    deletes elsewhere don't move it. This is only possible because S06/S07 gave every character a stable
 *    name. Feel how the foundation enables the feature.
 *
 * The happy path ships here. Edge cases — the anchored text deleted *entirely*, ranges spanning concurrent
 * structural edits — are the planted debt harvested in S13 (a fuzzy-text fallback).
 */

/** The naive anchor: a bare character index. Kept to CONTRAST with relative positions (it drifts). */
export function absoluteAnchor(index: number): number {
  return index;
}

/**
 * A relative anchor into a Y.Text/Y.XmlText, encoded for storage. It survives concurrent edits because it
 * references CRDT identity, not a coordinate.
 */
export function encodeRelativeAnchor(type: Y.Text | Y.XmlText, index: number): string {
  const rel = Y.createRelativePositionFromTypeIndex(type, index);
  return toB64(Y.encodeRelativePosition(rel));
}

/**
 * Resolve a stored relative anchor back to a current absolute index in `doc`. Returns null when the anchored
 * content no longer exists (the S13 edge case — a comment whose text was fully deleted needs a fallback).
 */
export function resolveRelativeAnchor(doc: Y.Doc, encoded: string): number | null {
  const rel = Y.decodeRelativePosition(fromB64(encoded));
  const abs = Y.createAbsolutePositionFromRelativePosition(rel, doc);
  return abs ? abs.index : null;
}

/**
 * S13 — HARVEST OF FLAW #3 (part 2). Relative positions (S09) handle *edits* around an anchor. But when the
 * anchored text is DELETED ENTIRELY, there's no identity left to resolve — the happy path returns a
 * boundary/null and the comment would silently point at the wrong place or vanish. The fix is a layered
 * fallback: try the relative position; if it can't resolve to the anchored text, FUZZY-MATCH the original
 * quoted text in the current document; if even that fails, mark the comment ORPHANED (shown detached, not
 * lost). 🔗 The S09 debate's resolution: relative positions primary, fuzzy match as the fallback for the one
 * case they can't handle.
 */
export type AnchorResolution =
  | { status: "anchored"; index: number }
  | { status: "fuzzy"; index: number }
  | { status: "orphaned" };

export function resolveAnchorWithFallback(doc: Y.Doc, encoded: string, quotedText: string, text: string): AnchorResolution {
  const index = resolveRelativeAnchor(doc, encoded);
  // The relative anchor resolved AND the quoted text is still there → precise anchor.
  if (index !== null && quotedText && text.slice(index, index + quotedText.length) === quotedText) {
    return { status: "anchored", index };
  }
  // Fuzzy fallback: find the quoted text elsewhere (nearest occurrence to the last-known index).
  if (quotedText) {
    const fuzzy = nearestOccurrence(text, quotedText, index ?? 0);
    if (fuzzy !== -1) return { status: "fuzzy", index: fuzzy };
  }
  // The anchored content is gone entirely → orphan the comment (detached, not deleted).
  return { status: "orphaned" };
}

/** The occurrence of `needle` in `text` closest to `near` (or -1 if absent). */
function nearestOccurrence(text: string, needle: string, near: number): number {
  let best = -1;
  let from = 0;
  for (;;) {
    const i = text.indexOf(needle, from);
    if (i === -1) break;
    if (best === -1 || Math.abs(i - near) < Math.abs(best - near)) best = i;
    from = i + 1;
  }
  return best;
}
