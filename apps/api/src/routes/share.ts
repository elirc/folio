import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@folio/db";
import { resolveShareLink, isShareDenial, isRole, type Role, type ShareLink } from "@folio/shared";

/**
 * Share-link routes (S11) — scoped capability tokens layered on role-based inheritance. Every link carries
 * an expiry option and can be revoked; a caller resolving a token gets a role or a typed denial. 🔗 Pulse
 * S10's lesson — the learner ships expiry + revocation from the start (no re-planted flaw).
 */
const CreateShare = z.object({
  role: z.enum(["viewer", "commenter", "editor"]).default("viewer"),
  expiresInHours: z.number().positive().max(24 * 365).nullable().default(24 * 7),
});

function toShared(link: { token: string; nodeId: string; role: string; expiresAt: Date | null; revoked: boolean }): ShareLink {
  return {
    token: link.token,
    nodeId: link.nodeId,
    role: (isRole(link.role) ? link.role : "viewer") as Role,
    expiresAt: link.expiresAt ? link.expiresAt.getTime() : null,
    revoked: link.revoked,
  };
}

export async function shareRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { nodeId: string } }>("/api/docs/:nodeId/share", async (req) => {
    return prisma.shareLink.findMany({
      where: { nodeId: req.params.nodeId, revoked: false },
      select: { id: true, token: true, role: true, expiresAt: true, createdAt: true },
    });
  });

  app.post<{ Params: { nodeId: string } }>("/api/docs/:nodeId/share", async (req, reply) => {
    const input = CreateShare.parse(req.body ?? {});
    const expiresAt = input.expiresInHours ? new Date(Date.now() + input.expiresInHours * 3600_000) : null;
    const link = await prisma.shareLink.create({
      data: { nodeId: req.params.nodeId, role: input.role, expiresAt },
      select: { id: true, token: true, role: true, expiresAt: true },
    });
    return reply.code(201).send(link);
  });

  app.post<{ Params: { id: string } }>("/api/share/:id/revoke", async (req, reply) => {
    const link = await prisma.shareLink.update({ where: { id: req.params.id }, data: { revoked: true } }).catch(() => null);
    if (!link) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "share link not found" } });
    return { ok: true };
  });

  // Resolve a token → the role it grants (or a typed denial). The gate a share-link visitor passes through.
  app.get<{ Params: { token: string } }>("/api/share/resolve/:token", async (req, reply) => {
    const row = await prisma.shareLink.findUnique({ where: { token: req.params.token } });
    const result = resolveShareLink(row ? toShared(row) : null, Date.now());
    if (isShareDenial(result)) return reply.code(403).send({ error: { code: result.toUpperCase(), message: `share link ${result}` } });
    return { nodeId: row!.nodeId, role: result };
  });
}
