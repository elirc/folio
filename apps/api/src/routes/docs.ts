import type { FastifyInstance } from "fastify";
import { prisma } from "@folio/db";
import { SaveDocSchema } from "@folio/shared";

/**
 * Doc content routes (load + save). In S01 this was the *whole* persistence surface — list, create, load,
 * save. S02 moves listing and creation into the tree (see routes/nodes.ts: a doc is a `Node` of type "doc"),
 * so this file narrows to what the editor actually needs: read a doc's text, write it back.
 *
 * Save is still deliberately naive — it replaces the entire `text`. From S05 concurrent saves fight over
 * that one string (last-write-wins, broken on purpose); S07 replaces the whole model with a Yjs update log.
 * Keeping it this simple now makes the pain of S05 — and the fix of S07 — legible.
 */
export async function docRoutes(app: FastifyInstance): Promise<void> {
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
