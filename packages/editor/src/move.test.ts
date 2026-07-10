import { describe, it, expect } from "vitest";
import { folioSchema } from "./schema";
import { createEditorState } from "./state";
import { moveTopLevelBlock } from "./move";

/** A doc of single-paragraph blocks with the given texts. */
function paraDoc(texts: string[]) {
  const s = folioSchema;
  return s.node(
    "doc",
    null,
    texts.map((t) => s.node("paragraph", { blockId: "b0000000" }, t ? s.text(t) : undefined)),
  );
}

function order(state: ReturnType<typeof createEditorState>): string[] {
  const out: string[] = [];
  state.doc.forEach((n) => out.push(n.textContent));
  return out;
}

describe("moveTopLevelBlock (S04, the pure core behind DnD)", () => {
  it("moves a block to the end", () => {
    const state = createEditorState(paraDoc(["A", "B", "C"]));
    const tr = moveTopLevelBlock(state, 0, 3)!;
    expect(order(state.apply(tr))).toEqual(["B", "C", "A"]);
  });

  it("moves a later block to the front", () => {
    const state = createEditorState(paraDoc(["A", "B", "C"]));
    const tr = moveTopLevelBlock(state, 2, 0)!;
    expect(order(state.apply(tr))).toEqual(["C", "A", "B"]);
  });

  it("moves a middle block up", () => {
    const state = createEditorState(paraDoc(["A", "B", "C", "D"]));
    const tr = moveTopLevelBlock(state, 2, 1)!;
    expect(order(state.apply(tr))).toEqual(["A", "C", "B", "D"]);
  });

  it("treats drop-onto-self and drop-just-after as no-ops", () => {
    const state = createEditorState(paraDoc(["A", "B", "C"]));
    expect(moveTopLevelBlock(state, 1, 1)).toBeNull(); // onto itself
    expect(moveTopLevelBlock(state, 1, 2)).toBeNull(); // just after itself = same place
  });

  it("rejects out-of-range indices", () => {
    const state = createEditorState(paraDoc(["A", "B"]));
    expect(moveTopLevelBlock(state, 5, 0)).toBeNull();
    expect(moveTopLevelBlock(state, 0, 9)).toBeNull();
  });
});
