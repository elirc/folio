import { describe, it, expect } from "vitest";
import { resolveNodeRole, roleRank, canEdit, canComment, canView, isRole } from "./acl";

describe("ACL resolution v1 (S02, no inheritance)", () => {
  it("uses the workspace role when there's no node grant", () => {
    expect(resolveNodeRole("editor", null)).toBe("editor");
  });

  it("a direct node grant promotes above the workspace role", () => {
    expect(resolveNodeRole("viewer", "editor")).toBe("editor");
  });

  it("a direct node grant DEMOTES below the workspace role (pin a sensitive doc)", () => {
    expect(resolveNodeRole("editor", "viewer")).toBe("viewer");
  });

  it("roles are a strict total order", () => {
    expect(roleRank("owner")).toBeGreaterThan(roleRank("editor"));
    expect(roleRank("editor")).toBeGreaterThan(roleRank("commenter"));
    expect(roleRank("commenter")).toBeGreaterThan(roleRank("viewer"));
  });

  it("capability gates follow the order", () => {
    expect(canEdit("editor")).toBe(true);
    expect(canEdit("commenter")).toBe(false);
    expect(canComment("commenter")).toBe(true);
    expect(canComment("viewer")).toBe(false);
    expect(canView("viewer")).toBe(true);
  });

  it("isRole guards untrusted strings", () => {
    expect(isRole("owner")).toBe(true);
    expect(isRole("admin")).toBe(false);
  });
});
