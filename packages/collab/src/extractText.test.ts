import { describe, it, expect } from "vitest";
import { docFromProseMirrorJSON } from "./ydoc";
import { extractPlainText } from "./extractText";

describe("extractPlainText — the search projection (S14)", () => {
  it("extracts a document's plain text from the Y.Doc", () => {
    const doc = docFromProseMirrorJSON({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1, blockId: null }, content: [{ type: "text", text: "Title" }] },
        { type: "paragraph", attrs: { blockId: null }, content: [{ type: "text", text: "some body text" }] },
      ],
    });
    const text = extractPlainText(doc);
    expect(text).toContain("Title");
    expect(text).toContain("some body text");
  });

  it("an empty doc extracts to empty text", () => {
    const doc = docFromProseMirrorJSON({ type: "doc", content: [{ type: "paragraph" }] });
    expect(extractPlainText(doc)).toBe("");
  });
});
