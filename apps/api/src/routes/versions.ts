import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@folio/db";
import { compact } from "@folio/collab";

/**
 * Version history routes (S10). A version is a COMPACTED snapshot of the document's Yjs state. Creating one
 * is cheap (snapshot the current state); reconstructing one is cheap (apply one blob). The API is thin — the
 * history *is* the update log, so most of the value is in the storage model, not these handlers.
 */
const CreateVersion = z.object({ label: z.string().trim().min(1).max(120).nullable().default(null) });

export async function versionRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { nodeId: string } }>("/api/docs/:nodeId/versions", async (req) => {
    const versions = await prisma.versionSnapshot.findMany({
      where: { nodeId: req.params.nodeId },
      orderBy: { seq: "desc" },
      select: { id: true, label: true, kind: true, seq: true, createdAt: true },
    });
    return versions;
  });

  // Create a checkpoint from the doc's current persisted Yjs state (compacted).
  app.post<{ Params: { nodeId: string } }>("/api/docs/:nodeId/versions", async (req, reply) => {
    const { label } = CreateVersion.parse(req.body ?? {});
    const state = await prisma.docState.findUnique({ where: { nodeId: req.params.nodeId }, select: { yUpdate: true } });
    if (!state?.yUpdate) return reply.code(409).send({ error: { code: "NO_STATE", message: "document has no Yjs state yet" } });

    // Compact the current state to a single snapshot blob (idempotent for a single update, but this is the
    // seam where a worker would fold in the update-log tail).
    const yState = Buffer.from(compact([new Uint8Array(state.yUpdate)]));
    const last = await prisma.versionSnapshot.findFirst({ where: { nodeId: req.params.nodeId }, orderBy: { seq: "desc" }, select: { seq: true } });
    const version = await prisma.versionSnapshot.create({
      data: { nodeId: req.params.nodeId, label, kind: label ? "named" : "auto", yState, seq: (last?.seq ?? 0) + 1 },
      select: { id: true, label: true, kind: true, seq: true, createdAt: true },
    });
    return reply.code(201).send(version);
  });

  // Fetch a version's compacted state (base64) for preview/reconstruction on the client.
  app.get<{ Params: { id: string } }>("/api/versions/:id", async (req, reply) => {
    const v = await prisma.versionSnapshot.findUnique({ where: { id: req.params.id }, select: { yState: true, seq: true } });
    if (!v) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "version not found" } });
    return { seq: v.seq, yState: v.yState.toString("base64") };
  });
}
