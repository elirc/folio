import type { FastifyInstance } from "fastify";
import { prisma } from "@folio/db";
import {
  CreateNodeSchema,
  RenameNodeSchema,
  MoveNodeSchema,
  keyBetween,
  keyAfter,
  wouldCreateCycle,
  ancestorsOf,
  type TreeNode,
} from "@folio/shared";

/**
 * Node (tree) CRUD (S02). Create/rename/move/delete folders and docs. The interesting rules — cycle
 * prevention on move and fractional-key placement — live as PURE functions in @folio/shared and are
 * exhaustively unit-tested there; these handlers are the thin I/O shell: load the sibling/tree rows, call
 * the pure rule, persist the single resulting change.
 */
export async function nodeRoutes(app: FastifyInstance): Promise<void> {
  // Whole-workspace tree (flat list; the client assembles it). Recursive reads (breadcrumb ancestors,
  // subtree delete) — we let Postgres cascade the delete and compute ancestors in app code from this list;
  // a recursive CTE would win only once the tree is deep (ADR-0003 notes the trigger to switch).
  app.get<{ Querystring: { workspaceId?: string } }>("/api/nodes", async (req, reply) => {
    const workspaceId = req.query.workspaceId;
    if (!workspaceId) return reply.code(400).send({ error: { code: "VALIDATION", message: "workspaceId required" } });
    const nodes = await prisma.node.findMany({
      where: { workspaceId },
      orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
      select: { id: true, parentId: true, type: true, title: true, sortOrder: true },
    });
    return nodes;
  });

  app.post("/api/nodes", async (req, reply) => {
    const input = CreateNodeSchema.parse(req.body);

    // Place after the given sibling (or append). We only need the neighbouring keys, not the whole set.
    const siblings = await prisma.node.findMany({
      where: { workspaceId: input.workspaceId, parentId: input.parentId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, sortOrder: true },
    });
    const sortOrder = keyForInsert(siblings, input.afterSiblingId);

    const node = await prisma.node.create({
      data: {
        workspaceId: input.workspaceId,
        parentId: input.parentId,
        type: input.type,
        title: input.title,
        sortOrder,
        ...(input.type === "doc" ? { docState: { create: { text: "" } } } : {}),
      },
      select: { id: true, parentId: true, type: true, title: true, sortOrder: true },
    });
    return reply.code(201).send(node);
  });

  app.patch<{ Params: { id: string } }>("/api/nodes/:id", async (req, reply) => {
    const { title } = RenameNodeSchema.parse(req.body);
    const node = await prisma.node
      .update({ where: { id: req.params.id }, data: { title }, select: { id: true, title: true } })
      .catch(() => null);
    if (!node) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "node not found" } });
    return node;
  });

  app.post<{ Params: { id: string } }>("/api/nodes/:id/move", async (req, reply) => {
    const move = MoveNodeSchema.parse(req.body);
    const target = await prisma.node.findUnique({
      where: { id: req.params.id },
      select: { id: true, workspaceId: true },
    });
    if (!target) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "node not found" } });

    // Cycle guard: load the workspace's edges and ask the pure rule BEFORE writing anything.
    const all = await prisma.node.findMany({
      where: { workspaceId: target.workspaceId },
      select: { id: true, parentId: true },
    });
    if (wouldCreateCycle(all as TreeNode[], target.id, move.newParentId)) {
      return reply.code(409).send({ error: { code: "CYCLE", message: "cannot move a node into its own subtree" } });
    }

    const siblings = await prisma.node.findMany({
      where: { workspaceId: target.workspaceId, parentId: move.newParentId, NOT: { id: target.id } },
      orderBy: { sortOrder: "asc" },
      select: { id: true, sortOrder: true },
    });
    const sortOrder = keyForMove(siblings, move.beforeSiblingId, move.afterSiblingId);

    const node = await prisma.node.update({
      where: { id: target.id },
      data: { parentId: move.newParentId, sortOrder },
      select: { id: true, parentId: true, sortOrder: true },
    });
    return node;
  });

  app.delete<{ Params: { id: string } }>("/api/nodes/:id", async (req, reply) => {
    // Cascade in the schema drops the whole subtree + its DocState/Acl rows in one statement.
    const deleted = await prisma.node.delete({ where: { id: req.params.id } }).catch(() => null);
    if (!deleted) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "node not found" } });
    return reply.code(204).send();
  });

  // Breadcrumb: ancestors root→node. Computed in app code from the workspace edge list (see note above).
  app.get<{ Params: { id: string } }>("/api/nodes/:id/breadcrumb", async (req, reply) => {
    const node = await prisma.node.findUnique({
      where: { id: req.params.id },
      select: { workspaceId: true },
    });
    if (!node) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "node not found" } });
    const all = await prisma.node.findMany({
      where: { workspaceId: node.workspaceId },
      select: { id: true, parentId: true, title: true },
    });
    const titleOf = new Map(all.map((n) => [n.id, n.title]));
    const chain = [...ancestorsOf(all as TreeNode[], req.params.id)].reverse(); // root → parent
    return chain.map((id) => ({ id, title: titleOf.get(id) ?? "" }));
  });
}

type Sib = { id: string; sortOrder: string };

/** Key for a new node placed after `afterSiblingId` (append if null/absent). */
function keyForInsert(siblings: readonly Sib[], afterSiblingId: string | null): string {
  if (afterSiblingId === null) {
    const last = siblings.length ? siblings[siblings.length - 1]!.sortOrder : null;
    return keyAfter(last);
  }
  const i = siblings.findIndex((s) => s.id === afterSiblingId);
  if (i === -1) return keyAfter(siblings.length ? siblings[siblings.length - 1]!.sortOrder : null);
  const next = siblings[i + 1]?.sortOrder ?? null;
  return keyBetween(siblings[i]!.sortOrder, next);
}

/** Key for a moved node dropped between `beforeSiblingId` and `afterSiblingId` within the new parent. */
function keyForMove(siblings: readonly Sib[], beforeSiblingId: string | null, afterSiblingId: string | null): string {
  const before = beforeSiblingId ? (siblings.find((s) => s.id === beforeSiblingId)?.sortOrder ?? null) : null;
  const after = afterSiblingId ? (siblings.find((s) => s.id === afterSiblingId)?.sortOrder ?? null) : null;
  if (before === null && after === null) {
    const last = siblings.length ? siblings[siblings.length - 1]!.sortOrder : null;
    return keyAfter(last);
  }
  return keyBetween(before, after);
}
