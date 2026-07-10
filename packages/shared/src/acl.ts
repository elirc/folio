// Access control, v1 (ADR-0003). Roles are a total order: owner > editor > commenter > viewer.
// A member has a workspace-default role; a per-node Acl entry can override it for one node.
//
// 📘 DELIBERATELY SHALLOW. v1 resolves a role from exactly two inputs: the member's workspace role and a
// DIRECT acl entry on THIS node. There is no inheritance — a role granted on a folder does NOT flow to the
// docs inside it. That's not an oversight; folder→descendant inheritance (and the "most specific ancestor
// wins" resolution, and revocation, and the "public link" role) is the entire subject of S11. Building it
// now would bury the interesting part under plumbing. Keep the surface small so S11 can be about the idea.

export const ROLES = ["viewer", "commenter", "editor", "owner"] as const;
export type Role = (typeof ROLES)[number];

/** Rank for comparison; higher = more powerful. */
export function roleRank(role: Role): number {
  return ROLES.indexOf(role);
}

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

/**
 * The effective role of a member on a node (v1). A direct node grant WINS over the workspace default —
 * up OR down: a viewer can be promoted to editor on one doc, and an editor can be pinned to viewer on a
 * sensitive one. Absent a node grant, the workspace role applies.
 *
 * v1 takes only THIS node's grant. S11 changes the second argument from "this node's grant" to "walk
 * ancestors for the nearest grant" — the signature barely moves, but the resolution becomes a tree walk.
 */
export function resolveNodeRole(workspaceRole: Role, directNodeRole: Role | null): Role {
  return directNodeRole ?? workspaceRole;
}

export function canView(role: Role): boolean {
  return roleRank(role) >= roleRank("viewer");
}
export function canComment(role: Role): boolean {
  return roleRank(role) >= roleRank("commenter");
}
export function canEdit(role: Role): boolean {
  return roleRank(role) >= roleRank("editor");
}
