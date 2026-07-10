import { describe, it, expect } from "vitest";
import { EditorState, TextSelection, type Command } from "prosemirror-state";
import { folioSchema } from "./schema";
import { createEditorState } from "./state";
import { suggestInsert, suggestDelete, acceptSuggestions, rejectSuggestions } from "./suggestions";

function run(state: EditorState, command: Command): EditorState | null {
  let next: EditorState | null = null;
  const ok = command(state, (tr) => {
    next = state.apply(tr);
  });
  return ok ? next : null;
}

/** A doc of one paragraph with the given text, cursor at end. */
function docWith(text: string): EditorState {
  const s = folioSchema;
  const doc = s.node("doc", null, [s.node("paragraph", { blockId: "b0000000" }, s.text(text))]);
  const state = createEditorState(doc);
  return state.apply(state.tr.setSelection(TextSelection.create(state.doc, state.doc.content.size - 1)));
}

function selectAll(state: EditorState): EditorState {
  return state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1, state.doc.content.size - 1)));
}

describe("suggestion mode (S09)", () => {
  it("suggestInsert adds text carrying the suggestion_insert mark (provisional, not yet permanent)", () => {
    const next = run(docWith("hello "), suggestInsert("world", "ann"))!;
    const text = next.doc.textContent;
    expect(text).toBe("hello world");
    // The new text carries the mark; accepting it drops the mark but keeps the text.
    const accepted = run(selectAll(next), acceptSuggestions)!;
    expect(accepted.doc.textContent).toBe("hello world");
    // No suggestion marks remain.
    let hasMark = false;
    accepted.doc.descendants((n) => {
      if (n.marks.some((m) => m.type.name.startsWith("suggestion_"))) hasMark = true;
    });
    expect(hasMark).toBe(false);
  });

  it("rejecting a suggested insertion removes the text", () => {
    const next = run(docWith("hello "), suggestInsert("world", "ann"))!;
    const rejected = run(selectAll(next), rejectSuggestions)!;
    expect(rejected.doc.textContent).toBe("hello ");
  });

  it("suggestDelete marks text struck-through without removing it; accept then removes it", () => {
    let state = docWith("keep remove");
    // select "remove" (positions 6..12 in a one-paragraph doc: para opens at 1, text starts at 1)
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 6, 12)));
    const marked = run(state, suggestDelete("bob"))!;
    expect(marked.doc.textContent).toBe("keep remove"); // still there, just marked
    const accepted = run(selectAll(marked), acceptSuggestions)!;
    expect(accepted.doc.textContent).toBe("keep "); // now actually removed
  });

  it("rejecting a suggested deletion keeps the text (drops the mark)", () => {
    let state = docWith("keep remove");
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 6, 12)));
    const marked = run(state, suggestDelete("bob"))!;
    const rejected = run(selectAll(marked), rejectSuggestions)!;
    expect(rejected.doc.textContent).toBe("keep remove");
  });
});
