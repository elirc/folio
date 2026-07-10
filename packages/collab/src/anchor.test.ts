import { describe, it, expect } from "vitest";
import * as Y from "yjs";
import { absoluteAnchor, encodeRelativeAnchor, resolveRelativeAnchor } from "./anchor";

/**
 * THE ANCHOR-DRIFT CONTRAST (S09). The clearest possible teaching of why relative positions exist: the same
 * concurrent edit that makes an absolute offset point at the WRONG text leaves a relative position exactly
 * where it belongs. Read the two halves side by side.
 */
describe("comment anchoring: absolute drifts, relative holds (S09)", () => {
  it("ABSOLUTE offset drifts when text is inserted before it (flaw #3)", () => {
    const doc = new Y.Doc();
    const t = doc.getText("t");
    t.insert(0, "the quick brown fox");
    //           0123456789...        "brown" starts at index 10
    const anchor = absoluteAnchor(10);
    expect(t.toString().slice(anchor, anchor + 5)).toBe("brown");

    // Someone inserts 4 chars at the start. The absolute anchor (still 10) now points at the WRONG text.
    t.insert(0, "OMG ");
    expect(t.toString().slice(anchor, anchor + 5)).not.toBe("brown"); // drifted — points at "uick " region
  });

  it("RELATIVE position stays on the same word through a concurrent insert before it", () => {
    const doc = new Y.Doc();
    const t = doc.getText("t");
    t.insert(0, "the quick brown fox");
    const encoded = encodeRelativeAnchor(t, 10); // anchor at "brown"

    t.insert(0, "OMG "); // concurrent insert before the anchor
    const idx = resolveRelativeAnchor(doc, encoded)!;
    expect(t.toString().slice(idx, idx + 5)).toBe("brown"); // held — tracks the character, not the coordinate
  });

  it("relative anchor also survives an insert AFTER it (no false movement)", () => {
    const doc = new Y.Doc();
    const t = doc.getText("t");
    t.insert(0, "alpha beta");
    const encoded = encodeRelativeAnchor(t, 0); // anchor at "alpha"
    t.insert(10, " gamma"); // insert at the end
    const idx = resolveRelativeAnchor(doc, encoded)!;
    expect(t.toString().slice(idx, idx + 5)).toBe("alpha");
  });

  it("[S13 edge] when the anchored text is fully deleted, resolution degrades (needs a fallback)", () => {
    const doc = new Y.Doc();
    const t = doc.getText("t");
    t.insert(0, "keep DELETEME keep");
    const encoded = encodeRelativeAnchor(t, 5); // inside "DELETEME"
    t.delete(5, 8); // remove "DELETEME"
    // Relative positions don't crash, but the anchor now lands at the deletion boundary — it can't point at
    // text that no longer exists. S13 adds a fuzzy-text fallback for this case; here we just prove it's
    // handled gracefully (a number or null), not a throw.
    const idx = resolveRelativeAnchor(doc, encoded);
    expect(idx === null || typeof idx === "number").toBe(true);
    expect(() => resolveRelativeAnchor(doc, encoded)).not.toThrow();
  });
});
