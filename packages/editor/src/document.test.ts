import { describe, it, expect } from "vitest";
import { emptyDoc, docToJSON, docFromJSON, plaintextToDoc } from "./document";

describe("document (de)serialization (S03)", () => {
  it("emptyDoc is a single paragraph with a block id", () => {
    const doc = emptyDoc();
    expect(doc.childCount).toBe(1);
    expect(doc.firstChild!.type.name).toBe("paragraph");
    expect(typeof doc.firstChild!.attrs.blockId).toBe("string");
  });

  it("round-trips a document through JSON", () => {
    const doc = emptyDoc();
    const back = docFromJSON(docToJSON(doc));
    expect(back.eq(doc)).toBe(true);
  });

  it("migrates a pre-S03 plaintext string into paragraphs", () => {
    const doc = plaintextToDoc("line one\nline two");
    expect(doc.childCount).toBe(2);
    expect(doc.firstChild!.textContent).toBe("line one");
  });

  it("docFromJSON tolerates a bare plaintext string (old S01/S02 rows still open)", () => {
    const doc = docFromJSON("just text");
    expect(doc.firstChild!.type.name).toBe("paragraph");
    expect(doc.firstChild!.textContent).toBe("just text");
  });

  it("docFromJSON degrades corruption to an empty doc instead of throwing", () => {
    expect(() => docFromJSON({ type: "doc", content: [{ type: "not_a_real_node" }] })).not.toThrow();
    const doc = docFromJSON({ garbage: true });
    expect(doc.firstChild!.type.name).toBe("paragraph");
  });

  it("docFromJSON of null yields an empty doc", () => {
    expect(docFromJSON(null).childCount).toBe(1);
  });
});
