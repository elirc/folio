import { describe, it, expect } from "vitest";
import * as Y from "yjs";
import { docFromProseMirrorJSON, proseMirrorJSONFromDoc, encodeState, applyUpdate } from "./ydoc";

describe("Yjs core smoke (S07)", () => {
  it("migrates ProseMirror JSON into a Y.Doc and back", () => {
    const json = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1, blockId: null }, content: [{ type: "text", text: "Hi" }] },
        { type: "paragraph", attrs: { blockId: null }, content: [{ type: "text", text: "world" }] },
      ],
    };
    const doc = docFromProseMirrorJSON(json);
    const back = proseMirrorJSONFromDoc(doc) as { content: unknown[] };
    expect(back.content).toHaveLength(2);
  });

  it("a full-state update rebuilds an identical doc on an empty peer", () => {
    const a = docFromProseMirrorJSON({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "abc" }] }] });
    const b = new Y.Doc();
    applyUpdate(b, encodeState(a));
    expect(JSON.stringify(proseMirrorJSONFromDoc(b))).toBe(JSON.stringify(proseMirrorJSONFromDoc(a)));
  });
});
