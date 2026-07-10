import { describe, it, expect } from "vitest";
import { resolveEffectiveRole, explainAccess, resolveNodeRole } from "./acl";

describe("ACL inheritance (S11 — the S02 seam cashed)", () => {
  it("no grants anywhere → the workspace default", () => {
    expect(resolveEffectiveRole("editor", [null, null, null])).toBe("editor");
  });

  it("a grant on the node itself wins (nearest)", () => {
    expect(resolveEffectiveRole("viewer", ["editor", "commenter", null])).toBe("editor");
  });

  it("inherits the nearest ANCESTOR grant when the node has none", () => {
    // node: no grant; parent: commenter; grandparent: editor → nearest is parent's commenter
    expect(resolveEffectiveRole("viewer", [null, "commenter", "editor"])).toBe("commenter");
  });

  it("overrides work BOTH ways — a subtree can RESTRICT below its parent", () => {
    // workspace editor, but this folder is locked to viewer
    expect(resolveEffectiveRole("editor", ["viewer", "editor"])).toBe("viewer");
  });

  it("overrides work BOTH ways — a subtree can GRANT above the workspace default", () => {
    expect(resolveEffectiveRole("viewer", ["owner", null])).toBe("owner");
  });

  it("resolveNodeRole is exactly the depth-1 case of the inheritance walk", () => {
    expect(resolveNodeRole("viewer", "editor")).toBe(resolveEffectiveRole("viewer", ["editor"]));
    expect(resolveNodeRole("viewer", null)).toBe(resolveEffectiveRole("viewer", [null]));
  });
});

describe("explainAccess — permissions must be debuggable (S11)", () => {
  it("explains a node override", () => {
    expect(explainAccess("viewer", ["editor", null])).toEqual({ role: "editor", reason: "node-override", depth: 0 });
  });

  it("explains an inherited grant with its depth", () => {
    expect(explainAccess("viewer", [null, null, "commenter"])).toEqual({ role: "commenter", reason: "inherited", depth: 2 });
  });

  it("explains the workspace default", () => {
    expect(explainAccess("editor", [null, null])).toEqual({ role: "editor", reason: "workspace-default", depth: -1 });
  });
});
