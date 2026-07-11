import { describe, it, expect } from "vitest";
import { scopeSearchResults, makeSnippet, type SearchHit } from "./search";

const hits: SearchHit[] = [
  { nodeId: "public", title: "Public", snippet: "…" },
  { nodeId: "secret", title: "Secret", snippet: "confidential text" },
];

describe("permission-scoped search (S14) — no leak", () => {
  it("filters out documents the viewer cannot read", () => {
    const scoped = scopeSearchResults(hits, (id) => id !== "secret");
    expect(scoped.map((h) => h.nodeId)).toEqual(["public"]);
    // the secret snippet never reaches the caller
    expect(scoped.some((h) => h.snippet.includes("confidential"))).toBe(false);
  });

  it("returns everything when the viewer can read all", () => {
    expect(scopeSearchResults(hits, () => true)).toHaveLength(2);
  });
});

describe("makeSnippet (S14)", () => {
  it("centres on the match with ellipses", () => {
    const text = "the quick brown fox jumps over the lazy dog and keeps going for a while more";
    const s = makeSnippet(text, "lazy", 10);
    expect(s).toContain("lazy");
    expect(s.startsWith("…")).toBe(true);
    expect(s.endsWith("…")).toBe(true);
  });

  it("returns a leading slice when there's no match (title-only hit)", () => {
    expect(makeSnippet("some body text here", "zzz", 5)).toContain("some");
  });
});
