import { describe, it, expect } from "vitest";
import { EditorState, TextSelection, type Transaction } from "prosemirror-state";
import { folioSchema } from "./schema";
import { createEditorState } from "./state";
import { folioInputRules } from "./inputRules";
import { makeBlockId } from "./blockId";

/**
 * Input rules fire from ProseMirror's `handleTextInput`, which normally the view calls. We don't need a
 * DOM: we build a state whose paragraph already holds the trigger prefix, put the cursor at its end, and
 * invoke the plugin's `handleTextInput` with the final character — exactly what the view would pass.
 */
function stateWithParagraph(text: string): EditorState {
  const doc = folioSchema.node("doc", null, [
    folioSchema.node("paragraph", { blockId: makeBlockId() }, text ? folioSchema.text(text) : undefined),
  ]);
  const state = createEditorState(doc);
  const end = state.doc.content.size - 1; // inside the paragraph, at its end
  return state.apply(state.tr.setSelection(TextSelection.create(state.doc, end)));
}

/** Type `char` at the cursor, letting input rules intercept. Returns the resulting doc's first block type. */
function typeTrigger(prefix: string, char: string): { firstType: string; state: EditorState } {
  let state = stateWithParagraph(prefix);
  const pos = state.selection.from;
  const view = {
    get state() {
      return state;
    },
    dispatch(tr: Transaction) {
      state = state.apply(tr);
    },
  };
  // The inputRules plugin's handleTextInput closes over its rules (it doesn't use `this`), so we can call
  // it directly. Cast to the documented 4-arg shape to sidestep PM's `this`-typed props signature.
  const handle = folioInputRules.props.handleTextInput as unknown as (
    view: unknown,
    from: number,
    to: number,
    text: string,
  ) => boolean;
  const handled = handle(view, pos, pos, char);
  // If no rule fired, apply the character literally so the assertion reflects reality.
  if (!handled) state = state.apply(state.tr.insertText(char, pos));
  return { firstType: state.doc.firstChild!.type.name, state };
}

describe("markdown input rules (S03)", () => {
  it("`# ` → heading level 1", () => {
    const { firstType, state } = typeTrigger("#", " ");
    expect(firstType).toBe("heading");
    expect(state.doc.firstChild!.attrs.level).toBe(1);
  });

  it("`### ` → heading level 3", () => {
    const { state } = typeTrigger("###", " ");
    expect(state.doc.firstChild!.type.name).toBe("heading");
    expect(state.doc.firstChild!.attrs.level).toBe(3);
  });

  it("`- ` → bullet list", () => {
    expect(typeTrigger("-", " ").firstType).toBe("bullet_list");
  });

  it("`> ` → blockquote", () => {
    expect(typeTrigger(">", " ").firstType).toBe("blockquote");
  });

  it("plain text does not trigger a rule", () => {
    expect(typeTrigger("hello", "x").firstType).toBe("paragraph");
  });
});
