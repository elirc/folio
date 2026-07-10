import type { EditorState, Transaction } from "prosemirror-state";

/**
 * Block reordering (S04) — the pure core behind drag-and-drop. The *view* part (dnd-kit, block handles,
 * hit-testing) lives in the web app; the *hard* part is mapping a drop to a document change, and that lives
 * here as a pure function so it's exhaustively testable without a browser.
 *
 * 🔍 SCREEN COORDINATES → DOCUMENT POSITIONS is where drag bugs breed. We don't reason in pixels here — the
 * web layer resolves a drop to a target block INDEX among the top-level blocks, and this function does the
 * document surgery: delete the dragged block, then insert it before the target index (accounting for the
 * shift the deletion causes). Keeping the surgery pure means the gnarly cases — drop onto self, drop at the
 * very end, target index after the removed block — are unit tests, not production incidents.
 */

/** Move the top-level block at index `from` to be at index `to` (before whatever currently sits at `to`). */
export function moveTopLevelBlock(state: EditorState, from: number, to: number): Transaction | null {
  const doc = state.doc;
  const count = doc.childCount;
  if (from < 0 || from >= count) return null;
  if (from === to || to === from + 1) return null; // no-op moves (dropping where it already is)
  if (to < 0 || to > count) return null;

  const node = doc.child(from);
  const fromStart = doc.resolve(0).posAtIndex(from);
  const fromEnd = fromStart + node.nodeSize;

  let tr = state.tr.delete(fromStart, fromEnd);

  // After the delete, indices past `from` shift left by one. Recompute the insert position in the new doc.
  const insertIndex = to > from ? to - 1 : to;
  const insertPos = tr.doc.resolve(0).posAtIndex(insertIndex);
  tr = tr.insert(insertPos, node);
  return tr;
}
