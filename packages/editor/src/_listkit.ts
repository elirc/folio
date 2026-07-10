import { TextSelection, type Command, type EditorState } from "prosemirror-state";
import { folioSchema } from "./schema";
import { createEditorState } from "./state";

/**
 * Shared list-building helpers for the S04 nesting/keyboard tests. Not exported from the package index —
 * this is a test fixture kit, kept in `src` only so the tests can import typed builders.
 */

/** A doc with one bullet_list whose items hold the given texts (empty string ⇒ an empty item). */
export function bulletDoc(texts: string[]): EditorState {
  const s = folioSchema;
  const items = texts.map((t) =>
    s.node("list_item", null, [s.node("paragraph", { blockId: "b0000000" }, t ? s.text(t) : undefined)]),
  );
  return createEditorState(s.node("doc", null, [s.node("bullet_list", null, items)]));
}

/** Place the cursor at the end of the first text node equal to `text`. */
export function cursorAtEndOf(state: EditorState, text: string): EditorState {
  let pos: number | null = null;
  state.doc.descendants((node, p) => {
    if (node.isText && node.text === text) pos = p + node.nodeSize;
  });
  if (pos === null) throw new Error(`text not found: ${text}`);
  return state.apply(state.tr.setSelection(TextSelection.create(state.doc, pos)));
}

/** Place the cursor inside the empty item at top-level list index `n` (0-based). */
export function cursorInEmptyItem(state: EditorState, n: number): EditorState {
  let count = -1;
  let pos: number | null = null;
  state.doc.descendants((node, p) => {
    if (node.type.name === "list_item" || node.type.name === "todo_item") {
      count++;
      if (count === n) pos = p + 2; // p → before item; +1 into item; +1 into its paragraph
      return false;
    }
    return true;
  });
  if (pos === null) throw new Error(`no item at index ${n}`);
  return state.apply(state.tr.setSelection(TextSelection.create(state.doc, pos)));
}

/** Run a command, returning the resulting state or null if it didn't apply. */
export function apply(state: EditorState, command: Command): EditorState | null {
  let next: EditorState | null = null;
  const ok = command(state, (tr) => {
    next = state.apply(tr);
  });
  return ok ? next : null;
}

/** How many top-level items does the bullet_list have? */
export function topLevelItemCount(state: EditorState): number {
  return state.doc.firstChild!.childCount;
}
