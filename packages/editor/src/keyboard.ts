import { chainCommands } from "prosemirror-commands";
import { splitListItem } from "prosemirror-schema-list";
import type { Command, EditorState } from "prosemirror-state";
import { folioSchema } from "./schema";
import { outdent } from "./nesting";

/**
 * Block-boundary keyboard semantics (S04). Editors live or die on the edge cases at block boundaries:
 * Enter at the end of a list item, Enter on an *empty* item, Backspace at the *start* of a nested item.
 * ⚠️ This is the combinatorial swamp — the test matrix is the real deliverable, not the code.
 */

const listItem = folioSchema.nodes.list_item;
const todoItem = folioSchema.nodes.todo_item;

/** Is the selection inside an EMPTY list/todo item (just an empty paragraph)? */
export function inEmptyListItem(state: EditorState): boolean {
  const { $from, empty } = state.selection;
  if (!empty) return false;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type.name === "list_item" || node.type.name === "todo_item") {
      // one child (the paragraph), and it's empty
      return node.childCount === 1 && node.firstChild!.content.size === 0;
    }
  }
  return false;
}

/** Enter on an empty list item EXITS the list (double-enter-to-exit); otherwise splits into a new item. */
export const exitEmptyListItem: Command = (state, dispatch) => {
  if (!inEmptyListItem(state)) return false;
  return outdent(state, dispatch);
};

/**
 * Enter semantics: exit-if-empty first, else continue the list (split into a fresh item). Falls through to
 * the base Enter for non-list content via the keymap chain in state.ts.
 */
export const enterInList: Command = chainCommands(
  exitEmptyListItem,
  splitListItem(listItem),
  splitListItem(todoItem),
);

/** Backspace at the START of a nested list item outdents it (instead of merging text upward). */
export const backspaceOutdent: Command = (state, dispatch) => {
  const { $from, empty } = state.selection;
  if (!empty || $from.parentOffset !== 0) return false; // only at the very start of the block
  for (let d = $from.depth; d > 0; d--) {
    const name = $from.node(d).type.name;
    if (name === "list_item" || name === "todo_item") return outdent(state, dispatch);
  }
  return false;
};
