import type { FastifyInstance } from "fastify";
import { prisma } from "@folio/db";
import { SaveDocSchema } from "@folio/shared";

/**
 * Doc CRUD (S01). Create a doc, load it, save its plaintext. This is the *whole* persistence surface for
 * now — and it's deliberately naive: save replaces the entire `text`. From S05 concurrent saves fight
 * over that one string (last-write-wins, broken on purpose); S07 replaces the whole model with a Yjs
 * update log. Keeping it this simple now makes the pain of S05 — and the fix of S07 — legible.
 */
export async function docRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/docs", async () => {
    const nodes = await prisma.node.findMany({
      where: { type: "doc" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true },
    });
    return nodes;
  });

  app.post("/api/docs", async (req, reply) => {
    const { title } = (req.body ?? {}) as { title?: string };
    const node = await prisma.node.create({
      data: { type: "doc", title: title?.trim() || "Untitled", docState: { create: { text: "" } } },
    });
    return reply.code(201).send({ id: node.id, title: node.title });
  });

  app.get<{ Params: { id: string } }>("/api/docs/:id", async (req, reply) => {
    const node = await prisma.node.findUnique({
      where: { id: req.params.id },
      include: { docState: true },
    });
    if (!node) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "doc not found" } });
    return { id: node.id, title: node.title, text: node.docState?.text ?? "" };
  });

  app.put<{ Params: { id: string } }>("/api/docs/:id", async (req) => {
    const { text } = SaveDocSchema.parse(req.body);
    const state = await prisma.docState.upsert({
      where: { nodeId: req.params.id },
      create: { nodeId: req.params.id, text },
      update: { text },
    });
    return { ok: true, updatedAt: state.updatedAt };
  });
}
