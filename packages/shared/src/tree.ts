// Pure tree logic for the document tree (ADR-0003). No Prisma, no I/O — just the shape rules, so they're
// exhaustively testable without a database. The API routes load rows, call these, then persist.

/** The only fields the tree rules need. The DB row has more; these are the edges. */
export interface TreeNode {
  id: string;
  parentId: string | null;
}

/**
 * Would moving `nodeId` under `newParentId` create a cycle? A tree stops being a tree the moment a node
 * becomes its own ancestor — moving a folder into one of its own descendants (or into itself) does exactly
 * that. We walk UP from the proposed new parent following parentId; if we reach `nodeId` before the root,
 * the move would close a loop.
 *
 * 🔗 Same shape as Relay S8's DAG cycle guard — there we validated a workflow graph before scheduling;
 * here we validate a tree before reparenting. A tree is just a DAG where every node has ≤ 1 parent, so the
 * check collapses from "search all paths" to "walk the single parent chain".
 */
export function wouldCreateCycle(
  nodes: readonly TreeNode[],
  nodeId: string,
  newParentId: string | null,
): boolean {
  if (newParentId === null) return false; // moving to the root can never cycle
  if (newParentId === nodeId) return true; // a node can't be its own parent

  const parentOf = new Map<string, string | null>();
  for (const n of nodes) parentOf.set(n.id, n.parentId);

  // Walk ancestors of the proposed parent. Guard against pre-existing corruption with a visited set so a
  // malformed store can't spin us forever.
  const seen = new Set<string>();
  let cur: string | null = newParentId;
  while (cur !== null) {
    if (cur === nodeId) return true;
    if (seen.has(cur)) break;
    seen.add(cur);
    cur = parentOf.get(cur) ?? null;
  }
  return false;
}

/** Ancestors of `nodeId`, nearest first (for a breadcrumb: reverse for root→node order). */
export function ancestorsOf(nodes: readonly TreeNode[], nodeId: string): string[] {
  const parentOf = new Map<string, string | null>();
  for (const n of nodes) parentOf.set(n.id, n.parentId);

  const out: string[] = [];
  const seen = new Set<string>();
  let cur = parentOf.get(nodeId) ?? null;
  while (cur !== null && !seen.has(cur)) {
    out.push(cur);
    seen.add(cur);
    cur = parentOf.get(cur) ?? null;
  }
  return out;
}
