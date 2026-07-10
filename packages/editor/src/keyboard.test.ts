import { describe, it, expect } from "vitest";
import { TextSelection, type EditorState } from "prosemirror-state";
import { enterInList, backspaceOutdent, inEmptyListItem, exitEmptyListItem } from "./keyboard";
import { indent } from "./nesting";
import { bulletDoc, cursorAtEndOf, cursorInEmptyItem, apply, topLevelItemCount } from "./_listkit";

function putCursorAtStartOf(state: EditorState, text: string): EditorState {
  let pos: number | null = null;
  state.doc.descendants((node, p) => {
    if (node.isText && node.text === text) pos = p;
  });
  if (pos === null) throw new Error(`text not found: ${text}`);
  return state.apply(state.tr.setSelection(TextSelection.create(state.doc, pos)));
}

describe("keyboard: list continuations & block-boundary edges (S04)", () => {
  it("Enter at the end of a list item splits into a new item (continue the list)", () => {
    const state = cursorAtEndOf(bulletDoc(["one"]), "one");
    const next = apply(state, enterInList);
    expect(next).not.toBeNull();
    expect(topLevelItemCount(next!)).toBe(2); // a fresh empty item appeared
  });

  it("Enter on an EMPTY item exits the list (double-enter-to-exit)", () => {
    // ["one", ""] — cursor in the empty second item; Enter should lift it OUT of the list.
    const state = cursorInEmptyItem(bulletDoc(["one", ""]), 1);
    expect(inEmptyListItem(state)).toBe(true);
    const next = apply(state, exitEmptyListItem);
    expect(next).not.toBeNull();
    expect(topLevelItemCount(next!)).toBe(1); // the empty item left the list
  });

  it("Backspace at the START of a nested item outdents it (not a text merge)", () => {
    // Nest "two" under "one", then backspace at its start.
    const nested = apply(cursorAtEndOf(bulletDoc(["one", "two"]), "two"), indent)!;
    const atStart = putCursorAtStartOf(nested, "two");
    const next = apply(atStart, backspaceOutdent);
    expect(next).not.toBeNull();
    expect(topLevelItemCount(next!)).toBe(2); // "two" lifted back to top level
  });

  it("Backspace mid/end-text does not outdent (falls through to base behavior)", () => {
    const state = cursorAtEndOf(bulletDoc(["hello"]), "hello"); // not at offset 0
    expect(apply(state, backspaceOutdent)).toBeNull();
  });
});
