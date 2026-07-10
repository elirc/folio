import type { FastifyInstance } from "fastify";
import { resolveMemberRole } from "../lib/permissions";

/**
 * ACL resolution (S02 → S11). S02 resolved a role from a single node's grant. S11 upgrades it to the full
 * INHERITANCE walk (`resolveMemberRole` climbs ancestors, nearest override wins) — and, crucially, the
 * response shape and route contract are UNCHANGED. That's the S02 seam paying off exactly as designed: the
 * hard change was local to the resolver.
 *
 * The `/access` response now also EXPLAINS itself (why can this member edit?) — permissions must be
 * debuggable, or they generate support tickets.
 */
export async function aclRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { nodeId: string }; Querystring: { memberId?: string } }>(
    "/api/nodes/:nodeId/access",
    async (req, reply) => {
      const memberId = req.query.memberId;
      if (!memberId) return reply.code(400).send({ error: { code: "VALIDATION", message: "memberId required" } });

      const explanation = await resolveMemberRole(req.params.nodeId, memberId);
      if (!explanation) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "member not found" } });

      const role = explanation.role;
      return {
        nodeId: req.params.nodeId,
        memberId,
        role,
        // WHY: node-override | inherited (depth N) | workspace-default — the effective-access explainer.
        because: explanation,
        can: {
          view: true,
          comment: role !== "viewer",
          edit: role === "editor" || role === "owner",
          manage: role === "owner",
        },
      };
    },
  );
}
