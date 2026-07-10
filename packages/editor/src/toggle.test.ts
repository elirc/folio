import { describe, it, expect } from "vitest";
import { toggleCollapse } from "./toggle";
import { createEditorState } from "./state";
import { bulletDoc, cursorAtEndOf, apply } from "./_listkit";

describe("collapsible blocks — collapse is DOCUMENT state (S04, ADR-0005)", () => {
  it("toggles the collapsed attr on the enclosing item", () => {
    let state = bulletDoc(["parent", "child"]);
    state = cursorAtEndOf(state, "parent");
    const collapsed = apply(state, toggleCollapse);
    expect(collapsed).not.toBeNull();
    // The attr lives IN THE DOCUMENT (so it serializes + syncs), not in local view state.
    const item = collapsed!.doc.firstChild!.firstChild!; // bullet_list → first list_item
    expect(item.attrs.collapsed).toBe(true);
  });

  it("is a real toggle — a second call flips it back", () => {
    let state = bulletDoc(["parent"]);
    state = cursorAtEndOf(state, "parent");
    const once = apply(state, toggleCollapse)!;
    const twice = apply(cursorAtEndOf(once, "parent"), toggleCollapse)!;
    expect(twice.doc.firstChild!.firstChild!.attrs.collapsed).toBe(false);
  });

  it("collapsed survives JSON serialization (proof it's document state)", () => {
    let state = bulletDoc(["parent"]);
    state = cursorAtEndOf(state, "parent");
    const collapsed = apply(state, toggleCollapse)!;
    const json = JSON.stringify(collapsed.doc.toJSON());
    expect(json).toContain('"collapsed":true');
  });

  it("does nothing outside a list item", () => {
    // A plain paragraph doc: no enclosing list/todo item ⇒ command reports inapplicable.
    const state = createEditorState();
    expect(apply(state, toggleCollapse)).toBeNull();
  });
});
