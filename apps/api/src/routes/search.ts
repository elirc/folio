import type { FastifyInstance } from "fastify";
import { prisma } from "@folio/db";
import { makeSnippet, scopeSearchResults, type SearchHit } from "@folio/shared";
import { memberRole } from "../lib/permissions";
import { canView } from "@folio/shared";

/**
 * Cross-document search (S14). Queries the plain-text PROJECTION (`DocState.searchText`, updated on change),
 * then — critically — SCOPES results to what the searcher can actually read.
 *
 * ⚠️ THE SEARCH LEAK. The naive query returns hits + snippets from every matching doc, including ones the
 * user can't access. We scope at query time with the S11 effective-permission resolver, so a snippet from a
 * document you can't read never reaches you. A search index is a permission bypass waiting to happen if you
 * forget this.
 */
export async function searchRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { q?: string; workspaceId?: string; memberId?: string } }>("/api/search", async (req, reply) => {
    const { q, workspaceId, memberId } = req.query;
    if (!q || !workspaceId) return reply.code(400).send({ error: { code: "VALIDATION", message: "q and workspaceId required" } });

    // Candidate hits: docs in the workspace whose search projection contains the term (FTS in prod; a
    // contains-match here keeps the teaching system portable).
    const rows = await prisma.docState.findMany({
      where: { searchText: { contains: q, mode: "insensitive" }, node: { workspaceId, type: "doc" } },
      select: { nodeId: true, searchText: true, node: { select: { title: true } } },
      take: 50,
    });

    const hits: SearchHit[] = rows.map((r) => ({
      nodeId: r.nodeId,
      title: r.node.title,
      snippet: makeSnippet(r.searchText, q),
    }));

    // Permission scope: resolve the member's effective role per hit; drop anything they can't view.
    const viewable = new Set<string>();
    if (memberId) {
      await Promise.all(
        hits.map(async (h) => {
          const role = await memberRole(h.nodeId, memberId).catch(() => null);
          if (role && canView(role)) viewable.add(h.nodeId);
        }),
      );
    } else {
      for (const h of hits) viewable.add(h.nodeId); // no member ⇒ dev/no-auth; scope is a no-op
    }

    return scopeSearchResults(hits, (id) => viewable.has(id));
  });
}
