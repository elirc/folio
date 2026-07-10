import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@folio/db";

/**
 * Comment routes (S09). A comment stores its `anchor` as an opaque base64 Yjs relative position — the API
 * never interprets it; the client encodes/decodes against the live Y.Doc (that's the only place the CRDT
 * lives). The server just stores threads and resolution. 🔗 Anchor durability is a client concern precisely
 * because only the client has the Y.Doc to resolve a relative position against.
 */
const CreateComment = z.object({
  author: z.string().min(1),
  body: z.string().min(1).max(5000),
  anchor: z.string().min(1), // encoded relative position (client-produced)
  parentId: z.string().nullable().default(null),
});

export async function commentRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { nodeId: string }; Querystring: { resolved?: string } }>(
    "/api/docs/:nodeId/comments",
    async (req) => {
      const where = { nodeId: req.params.nodeId, ...(req.query.resolved === undefined ? {} : { resolved: req.query.resolved === "true" }) };
      return prisma.comment.findMany({ where, orderBy: { createdAt: "asc" } });
    },
  );

  app.post<{ Params: { nodeId: string } }>("/api/docs/:nodeId/comments", async (req, reply) => {
    const input = CreateComment.parse(req.body);
    const comment = await prisma.comment.create({
      data: { nodeId: req.params.nodeId, author: input.author, body: input.body, anchor: input.anchor, parentId: input.parentId },
    });
    return reply.code(201).send(comment);
  });

  app.post<{ Params: { id: string } }>("/api/comments/:id/resolve", async (req, reply) => {
    const c = await prisma.comment.update({ where: { id: req.params.id }, data: { resolved: true } }).catch(() => null);
    if (!c) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "comment not found" } });
    return c;
  });
}
