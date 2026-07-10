import { sinkListItem, liftListItem } from "prosemirror-schema-list";
import type { Command, EditorState } from "prosemirror-state";
import { folioSchema } from "./schema";

/**
 * Nesting (S04). Indent/outdent are STRUCTURAL transactions, not CSS margins — indenting a list item makes
 * it a child of the item above it, changing the document *tree*. 📘 Learning to express intent as PM steps
 * matters enormously in S07, when Yjs syncs exactly these steps between collaborators: a "CSS indent" would
 * sync nothing meaningful, while a structural step describes a real change everyone can converge on.
 */

/** Cap nesting so a runaway Tab can't build a pathological tree (and so layout stays sane). */
export const MAX_LIST_DEPTH = 6;

const listItem = folioSchema.nodes.list_item;
const todoItem = folioSchema.nodes.todo_item;

/** Depth of list nesting at the current selection (0 = not in a list). */
export function listDepthAt(state: EditorState): number {
  const { $from } = state.selection;
  let depth = 0;
  for (let d = $from.depth; d > 0; d--) {
    const name = $from.node(d).type.name;
    if (name === "list_item" || name === "todo_item") depth++;
  }
  return depth;
}

/** Indent: sink the current list item under its previous sibling, unless we're at the depth cap. */
export const indent: Command = (state, dispatch) => {
  if (listDepthAt(state) >= MAX_LIST_DEPTH) return false; // refuse past the cap (a no-op the keymap can fall through)
  return sinkListItem(listItem)(state, dispatch) || sinkListItem(todoItem)(state, dispatch);
};

/** Outdent: lift the current list item out one level. */
export const outdent: Command = (state, dispatch) => {
  return liftListItem(listItem)(state, dispatch) || liftListItem(todoItem)(state, dispatch);
};
