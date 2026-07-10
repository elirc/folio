import { describe, it, expect } from "vitest";
import { Node as PMNode } from "prosemirror-model";
import { folioSchema, BLOCK_TYPES } from "./schema";
import { makeBlockId } from "./blockId";

describe("folioSchema (S03)", () => {
  it("builds a valid document from JSON and round-trips it", () => {
    const doc = folioSchema.node("doc", null, [
      folioSchema.node("heading", { level: 1, blockId: makeBlockId() }, folioSchema.text("Title")),
      folioSchema.node("paragraph", { blockId: makeBlockId() }, folioSchema.text("Hello world")),
    ]);
    const json = doc.toJSON();
    const back = PMNode.fromJSON(folioSchema, json);
    expect(back.eq(doc)).toBe(true);
  });

  it("makes illegal documents unrepresentable — a doc of raw text is rejected", () => {
    // `doc` is `block+`; a bare text node at the top is not a block, so fromJSON/check must reject it.
    const illegal = { type: "doc", content: [{ type: "text", text: "nope" }] };
    expect(() => PMNode.fromJSON(folioSchema, illegal).check()).toThrow();
  });

  it("forbids inline marks inside a code block", () => {
    expect(folioSchema.nodes.code_block.spec.marks).toBe("");
  });

  it("supports every advertised block type", () => {
    for (const t of BLOCK_TYPES) expect(folioSchema.nodes[t]).toBeTruthy();
  });

  it("has the four inline marks", () => {
    for (const m of ["strong", "em", "code", "link"]) expect(folioSchema.marks[m]).toBeTruthy();
  });
});
