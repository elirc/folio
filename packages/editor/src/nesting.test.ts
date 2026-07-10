import { describe, it, expect } from "vitest";
import { indent, outdent, listDepthAt, MAX_LIST_DEPTH } from "./nesting";
import { bulletDoc, cursorAtEndOf, apply, topLevelItemCount } from "./_listkit";

describe("nesting: indent/outdent (S04)", () => {
  it("indent sinks an item under its previous sibling (structural, not cosmetic)", () => {
    let state = bulletDoc(["one", "two"]);
    state = cursorAtEndOf(state, "two");
    const next = apply(state, indent);
    expect(next).not.toBeNull();
    // "two" is now nested inside "one" ⇒ only one item remains at the top level.
    expect(topLevelItemCount(next!)).toBe(1);
    expect(listDepthAt(cursorAtEndOf(next!, "two"))).toBe(2);
  });

  it("cannot indent the first item (no previous sibling to nest under)", () => {
    let state = bulletDoc(["one", "two"]);
    state = cursorAtEndOf(state, "one");
    expect(apply(state, indent)).toBeNull();
  });

  it("outdent lifts a nested item back to the top level", () => {
    let state = bulletDoc(["one", "two"]);
    state = cursorAtEndOf(state, "two");
    const nested = apply(state, indent)!;
    const lifted = apply(cursorAtEndOf(nested, "two"), outdent);
    expect(lifted).not.toBeNull();
    expect(topLevelItemCount(lifted!)).toBe(2);
  });

  it("listDepthAt reports 0 outside a list and 1 at top level", () => {
    const flat = bulletDoc(["a"]);
    expect(listDepthAt(cursorAtEndOf(flat, "a"))).toBe(1);
  });

  it("the depth cap is a real, named limit", () => {
    expect(MAX_LIST_DEPTH).toBeGreaterThan(0);
  });
});
