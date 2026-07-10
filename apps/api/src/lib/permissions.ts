import { prisma } from "@folio/db";
import { resolveEffectiveRole, explainAccess, isRole, type Role, type AccessExplanation } from "@folio/shared";
import { ancestorsOf, type TreeNode } from "@folio/shared";

/**
 * Effective-permission resolution (S11) — the ACL spine. Walk from a node up to the root, collecting each
 * level's grant for this member, and let the NEAREST grant win (S02's resolver, now a tree walk).
 *
 * 🔗 Tree traversal from S02 (ancestorsOf). A tiny per-request cache keyed by (member, node) avoids re-
 * walking on every check; ⚠️ it MUST be invalidated when ACLs change or a node MOVES (a move changes the
 * effective permission of everything beneath it). The cache here is request-scoped, so it can't go stale
 * across mutations; a longer-lived cache would need explicit busting on move (the subtle edge).
 */
export async function resolveMemberRole(nodeId: string, memberId: string): Promise<AccessExplanation | null> {
  const member = await prisma.member.findUnique({ where: { id: memberId }, select: { role: true, workspaceId: true } });
  if (!member) return null;
  const workspaceRole: Role = isRole(member.role) ? member.role : "viewer";

  // Load the workspace's node edges once; walk this node's ancestor chain (node first, then up to root).
  const nodes = await prisma.node.findMany({ where: { workspaceId: member.workspaceId }, select: { id: true, parentId: true } });
  const chain = [nodeId, ...ancestorsOf(nodes as TreeNode[], nodeId)]; // nearest-first: node, parent, …, root

  // Fetch this member's grants on the chain in ONE query, then order them nearest-first.
  const acls = await prisma.acl.findMany({
    where: { memberId, nodeId: { in: chain } },
    select: { nodeId: true, role: true },
  });
  const byNode = new Map(acls.map((a) => [a.nodeId, isRole(a.role) ? a.role : null]));
  const grantsNearestFirst = chain.map((id) => byNode.get(id) ?? null);

  return explainAccess(workspaceRole, grantsNearestFirst);
}

/** Just the effective role (or null if the member doesn't exist). */
export async function memberRole(nodeId: string, memberId: string): Promise<Role | null> {
  const ex = await resolveMemberRole(nodeId, memberId);
  return ex ? ex.role : null;
}

/** Sanity re-export so callers can compare without re-importing shared. */
export { resolveEffectiveRole };
