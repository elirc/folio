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
