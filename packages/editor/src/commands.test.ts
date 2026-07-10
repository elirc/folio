import { describe, it, expect } from "vitest";
import { EditorState, type Command } from "prosemirror-state";
import { folioSchema } from "./schema";
import { createEditorState } from "./state";
import { toHeading, toBulletList, insertDivider, filterSlashItems, SLASH_ITEMS } from "./commands";

/** Apply a command to a state and return the resulting state (or null if it didn't apply). */
function run(state: EditorState, command: Command): EditorState | null {
  let next: EditorState | null = null;
  const applied = command(state, (tr) => {
    next = state.apply(tr);
  });
  return applied ? next : null;
}

describe("block commands (S03)", () => {
  it("toHeading turns the current paragraph into a heading", () => {
    const state = createEditorState();
    const next = run(state, toHeading(2));
    expect(next).not.toBeNull();
    expect(next!.doc.firstChild!.type.name).toBe("heading");
    expect(next!.doc.firstChild!.attrs.level).toBe(2);
  });

  it("toBulletList wraps the block in a bullet list", () => {
    const state = createEditorState();
    const next = run(state, toBulletList);
    expect(next).not.toBeNull();
    expect(next!.doc.firstChild!.type.name).toBe("bullet_list");
  });

  it("insertDivider drops a divider node", () => {
    const state = createEditorState();
    const next = run(state, insertDivider);
    expect(next).not.toBeNull();
    const types = next!.doc.content.content.map((n) => n.type.name);
    expect(types).toContain("divider");
  });

  it("commands report inapplicability without a dispatch (menu greying)", () => {
    // A dead-simple probe: an empty state with the cursor in a paragraph — heading applies, so returns true.
    const state = createEditorState();
    expect(toHeading(1)(state, undefined)).toBe(true);
  });
});

describe("slash menu filter (S03)", () => {
  it("returns everything for an empty query", () => {
    expect(filterSlashItems("")).toHaveLength(SLASH_ITEMS.length);
  });

  it("matches on label and keywords", () => {
    expect(filterSlashItems("todo").some((i) => i.type === "todo_list")).toBe(true);
    expect(filterSlashItems("checkbox").some((i) => i.type === "todo_list")).toBe(true); // keyword hit
    expect(filterSlashItems("h1").some((i) => i.type === "h1")).toBe(true);
  });

  it("narrows to nothing on a miss", () => {
    expect(filterSlashItems("zzzznope")).toHaveLength(0);
  });

  it("every slash item carries the schema mark/node it targets", () => {
    for (const item of SLASH_ITEMS) {
      const known = item.type === "h1" || item.type === "h2" || item.type === "h3" || folioSchema.nodes[item.type];
      expect(known).toBeTruthy();
    }
  });
});
