import { describe, it, expect } from "vitest";
import { wouldCreateCycle, ancestorsOf, type TreeNode } from "./tree";

//   root
//   ├─ a
//   │  └─ a1
//   │     └─ a2
//   └─ b
const nodes: TreeNode[] = [
  { id: "root", parentId: null },
  { id: "a", parentId: "root" },
  { id: "a1", parentId: "a" },
  { id: "a2", parentId: "a1" },
  { id: "b", parentId: "root" },
];

describe("wouldCreateCycle (S02)", () => {
  it("rejects moving a node into itself", () => {
    expect(wouldCreateCycle(nodes, "a", "a")).toBe(true);
  });

  it("rejects moving a folder into its own descendant", () => {
    expect(wouldCreateCycle(nodes, "a", "a2")).toBe(true); // a can't live under a2, which is under a
    expect(wouldCreateCycle(nodes, "a", "a1")).toBe(true);
  });

  it("allows moving into a sibling's subtree", () => {
    expect(wouldCreateCycle(nodes, "a", "b")).toBe(false);
  });

  it("allows moving to the root", () => {
    expect(wouldCreateCycle(nodes, "a2", null)).toBe(false);
  });

  it("does not loop forever on a corrupted store", () => {
    const broken: TreeNode[] = [
      { id: "x", parentId: "y" },
      { id: "y", parentId: "x" },
    ];
    // Whatever the answer, it must terminate — the visited-set guard is the point.
    expect(() => wouldCreateCycle(broken, "x", "y")).not.toThrow();
  });
});

describe("ancestorsOf (breadcrumb source)", () => {
  it("lists ancestors nearest-first", () => {
    expect(ancestorsOf(nodes, "a2")).toEqual(["a1", "a", "root"]);
  });

  it("returns empty for a root node", () => {
    expect(ancestorsOf(nodes, "root")).toEqual([]);
  });
});
