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

/**
 * S11 — ACL INHERITANCE (the S02 seam cashed). Effective role = the NEAREST grant walking from the node up
 * to the root; absent any grant, the workspace default. `grantsNearestFirst[0]` is the grant on the node
 * itself (or null), then its parent, then grandparent, … up to the root.
 *
 * 📘 Overrides work BOTH ways. The nearest grant wins whether it's *more* permissive than an ancestor
 * ("this folder is view-only but this doc is editable") or *less* ("this workspace is editable but this
 * folder is locked"). Real ACLs need grant-AND-restrict, not just grant — so we take the nearest grant
 * verbatim, never `max()` it against ancestors. 🔗 Exactly the resolver S02 promised: the signature barely
 * moved (this node's grant → the nearest ancestor's grant), and `resolveNodeRole` is just the depth-1 case.
 */
export function resolveEffectiveRole(workspaceRole: Role, grantsNearestFirst: readonly (Role | null)[]): Role {
  for (const grant of grantsNearestFirst) {
    if (grant !== null) return grant; // nearest override wins — up OR down
  }
  return workspaceRole;
}

/** An access explanation: the effective role AND *why* (which level granted it) — permissions must be debuggable. */
export interface AccessExplanation {
  role: Role;
  reason: "node-override" | "inherited" | "workspace-default";
  /** How many levels up the grant was found (0 = on the node itself), or -1 for the workspace default. */
  depth: number;
}

export function explainAccess(workspaceRole: Role, grantsNearestFirst: readonly (Role | null)[]): AccessExplanation {
  for (let depth = 0; depth < grantsNearestFirst.length; depth++) {
    const grant = grantsNearestFirst[depth];
    if (grant != null) return { role: grant, reason: depth === 0 ? "node-override" : "inherited", depth };
  }
  return { role: workspaceRole, reason: "workspace-default", depth: -1 };
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
