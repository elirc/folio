import { describe, it, expect } from "vitest";
import fc from "fast-check";
import * as Y from "yjs";
import { encodeRelativeAnchor, resolveAnchorWithFallback } from "./anchor";

/**
 * THE ANCHOR-DRIFT FUZZER (S13 — harvest of flaw #3, part 2). S09 handled edits *around* an anchor; the
 * planted edge was the anchored text being DELETED. This fuzzer applies random edits (including deleting the
 * anchored word) and asserts the layered fallback always produces a sane, non-crashing result: anchored →
 * fuzzy → orphaned.
 */
describe("anchor drift under deletion (S13)", () => {
  it("still anchored precisely when the quoted text survives", () => {
    const doc = new Y.Doc();
    const t = doc.getText("t");
    t.insert(0, "the quick brown fox");
    const encoded = encodeRelativeAnchor(t, 10); // "brown"
    t.insert(0, "OMG "); // edit before it
    const r = resolveAnchorWithFallback(doc, encoded, "brown", t.toString());
    expect(r.status).toBe("anchored");
    if (r.status === "anchored") expect(t.toString().slice(r.index, r.index + 5)).toBe("brown");
  });

  it("FUZZY-matches when the anchored word was deleted then still exists elsewhere", () => {
    const doc = new Y.Doc();
    const t = doc.getText("t");
    t.insert(0, "brown here and brown there");
    const encoded = encodeRelativeAnchor(t, 0); // first "brown"
    t.delete(0, 6); // delete the first "brown " → relative anchor loses its exact spot
    const r = resolveAnchorWithFallback(doc, encoded, "brown", t.toString());
    expect(r.status === "anchored" || r.status === "fuzzy").toBe(true);
    if (r.status !== "orphaned") expect(t.toString().slice(r.index, r.index + 5)).toBe("brown");
  });

  it("ORPHANS the comment when the quoted text is gone entirely (not lost, just detached)", () => {
    const doc = new Y.Doc();
    const t = doc.getText("t");
    t.insert(0, "keep UNIQUEWORD keep");
    const encoded = encodeRelativeAnchor(t, 5);
    t.delete(5, 10); // remove "UNIQUEWORD"
    const r = resolveAnchorWithFallback(doc, encoded, "UNIQUEWORD", t.toString());
    expect(r.status).toBe("orphaned");
  });

  it("property: resolution never crashes and always classifies, under random deletions", () => {
    fc.assert(
      fc.property(fc.array(fc.record({ at: fc.nat(30), len: fc.nat(8) }), { maxLength: 20 }), (dels) => {
        const doc = new Y.Doc();
        const t = doc.getText("t");
        t.insert(0, "alpha beta gamma delta epsilon");
        const encoded = encodeRelativeAnchor(t, 6); // "beta"
        for (const d of dels) {
          const at = t.length === 0 ? 0 : d.at % t.length;
          const len = Math.min(d.len, t.length - at);
          if (len > 0) t.delete(at, len);
        }
        const r = resolveAnchorWithFallback(doc, encoded, "beta", t.toString());
        expect(["anchored", "fuzzy", "orphaned"]).toContain(r.status);
      }),
      { numRuns: 200 },
    );
  });
});
