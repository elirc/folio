import type { Command } from "prosemirror-state";
import { folioSchema } from "./schema";

/**
 * Suggestion mode (S09) — tracked changes as a MARK layer over the document (which is a CRDT, so suggestions
 * sync like any other content until resolved).
 *
 * 📘 A suggestion is NOT a real edit yet. Proposed new text is tagged with the `suggestion_insert` mark;
 * text proposed for removal is tagged `suggestion_delete` (it stays visible, struck through). Accept/reject
 * are ordinary transactions that turn the provisional mark into a real change (or revert it). Modeling
 * tracked changes as marks — rather than a parallel edit log — means they ride the CRDT for free and never
 * desync from the text they annotate.
 */

const s = folioSchema;

/** Propose inserting `text` at the cursor (tagged as a suggestion by `author`). */
export function suggestInsert(text: string, author: string): Command {
  return (state, dispatch) => {
    if (dispatch) {
      const mark = s.marks.suggestion_insert.create({ author });
      dispatch(state.tr.replaceSelectionWith(s.text(text, [mark]), false));
    }
    return true;
  };
}

/** Propose deleting the current selection (marks it, does NOT remove it yet). */
export function suggestDelete(author: string): Command {
  return (state, dispatch) => {
    const { from, to, empty } = state.selection;
    if (empty) return false;
    if (dispatch) dispatch(state.tr.addMark(from, to, s.marks.suggestion_delete.create({ author })));
    return true;
  };
}

/**
 * Accept all suggestions in a range: suggested insertions become permanent (drop the mark), suggested
 * deletions are actually removed. Returns false if there's nothing to accept.
 */
export const acceptSuggestions: Command = (state, dispatch) => {
  const { from, to } = state.selection;
  const tr = state.tr;
  let changed = false;
  // Walk the range; delete `suggestion_delete` text, un-mark `suggestion_insert` text. Iterate from the end
  // so deletions don't shift earlier positions.
  const ops: { from: number; to: number; kind: "drop-ins" | "remove-del" }[] = [];
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isText) return;
    const start = Math.max(pos, from);
    const end = Math.min(pos + node.nodeSize, to);
    if (node.marks.some((m) => m.type === s.marks.suggestion_delete)) ops.push({ from: start, to: end, kind: "remove-del" });
    else if (node.marks.some((m) => m.type === s.marks.suggestion_insert)) ops.push({ from: start, to: end, kind: "drop-ins" });
  });
  for (const op of ops.reverse()) {
    changed = true;
    if (op.kind === "remove-del") tr.delete(op.from, op.to);
    else tr.removeMark(op.from, op.to, s.marks.suggestion_insert);
  }
  if (changed && dispatch) dispatch(tr);
  return changed;
};

/**
 * Reject all suggestions in a range: suggested insertions are removed, suggested deletions are kept (drop
 * the delete mark). The mirror image of accept.
 */
export const rejectSuggestions: Command = (state, dispatch) => {
  const { from, to } = state.selection;
  const tr = state.tr;
  let changed = false;
  const ops: { from: number; to: number; kind: "remove-ins" | "keep-del" }[] = [];
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isText) return;
    const start = Math.max(pos, from);
    const end = Math.min(pos + node.nodeSize, to);
    if (node.marks.some((m) => m.type === s.marks.suggestion_insert)) ops.push({ from: start, to: end, kind: "remove-ins" });
    else if (node.marks.some((m) => m.type === s.marks.suggestion_delete)) ops.push({ from: start, to: end, kind: "keep-del" });
  });
  for (const op of ops.reverse()) {
    changed = true;
    if (op.kind === "remove-ins") tr.delete(op.from, op.to);
    else tr.removeMark(op.from, op.to, s.marks.suggestion_delete);
  }
  if (changed && dispatch) dispatch(tr);
  return changed;
};
