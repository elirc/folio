import type { FastifyInstance } from "fastify";
import { prisma } from "@folio/db";
import { resolveNodeRole, isRole, type Role } from "@folio/shared";

/**
 * ACL resolution v1 (S02) — [A] authored, because it's the seam of the S11 deep-dive and worth writing
 * carefully. Given a member and a node, return the member's EFFECTIVE role and derived capabilities.
 *
 * v1 rule (ADR-0003): effective role = the direct Acl grant on THIS node if present, else the member's
 * workspace-default role. NO inheritance — a role on a parent folder does not reach this node. S11 turns
 * the single-row lookup below into an ancestor walk ("nearest grant wins"); the response shape won't move,
 * which is deliberate — the endpoint's contract survives the upgrade.
 */
export async function aclRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { nodeId: string }; Querystring: { memberId?: string } }>(
    "/api/nodes/:nodeId/access",
    async (req, reply) => {
      const memberId = req.query.memberId;
      if (!memberId) return reply.code(400).send({ error: { code: "VALIDATION", message: "memberId required" } });

      const [member, grant] = await Promise.all([
        prisma.member.findUnique({ where: { id: memberId }, select: { role: true, workspaceId: true } }),
        prisma.acl.findUnique({
          where: { nodeId_memberId: { nodeId: req.params.nodeId, memberId } },
          select: { role: true },
        }),
      ]);
      if (!member) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "member not found" } });

      // Roles are strings in the DB (Prisma has no native enum on SQLite-style portability here); validate
      // at the edge so a bad row can't smuggle an unknown role into the resolver.
      const workspaceRole: Role = isRole(member.role) ? member.role : "viewer";
      const directRole: Role | null = grant && isRole(grant.role) ? grant.role : null;
      const role = resolveNodeRole(workspaceRole, directRole);

      return {
        nodeId: req.params.nodeId,
        memberId,
        role,
        // Convenience capability flags so the client doesn't re-implement the role order.
        can: {
          view: true, // any resolvable role can at least view in v1
          comment: role !== "viewer",
          edit: role === "editor" || role === "owner",
          manage: role === "owner",
        },
      };
    },
  );
}
