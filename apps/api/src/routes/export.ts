import type { FastifyInstance } from "fastify";
import * as Y from "yjs";
import { prisma } from "@folio/db";
import { proseMirrorJSONFromDoc } from "@folio/collab";
import { pmToMarkdown, pmToHtml } from "@folio/editor";

/**
 * Export (S14). Load the document's Yjs state, project it to ProseMirror JSON, and render Markdown / HTML.
 * PDF is a fast-forward (server-side render) — stubbed here with a clear 501, because the lesson is the
 * lossy-projection principle, not the PDF toolchain.
 *
 * 📘 Export is a PROJECTION onto a lossy target — see EXPORT_LOSSINESS. We serve the format and let the UI
 * surface what it drops, rather than pretending a round-trip is clean.
 */
export async function exportRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string }; Querystring: { format?: string } }>("/api/docs/:id/export", async (req, reply) => {
    const format = req.query.format ?? "markdown";
    const state = await prisma.docState.findUnique({ where: { nodeId: req.params.id }, select: { yUpdate: true } });
    if (!state?.yUpdate) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "document has no content" } });

    const doc = new Y.Doc();
    Y.applyUpdate(doc, new Uint8Array(state.yUpdate));
    const pmJSON = proseMirrorJSONFromDoc(doc) as Parameters<typeof pmToMarkdown>[0];

    switch (format) {
      case "markdown":
      case "md":
        return reply.type("text/markdown").send(pmToMarkdown(pmJSON));
      case "html":
        return reply.type("text/html").send(htmlDocument(pmToHtml(pmJSON)));
      case "pdf":
        return reply.code(501).send({ error: { code: "NOT_IMPLEMENTED", message: "PDF export is a deferred fast-forward" } });
      default:
        return reply.code(400).send({ error: { code: "VALIDATION", message: `unknown format: ${format}` } });
    }
  });
}

function htmlDocument(body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Folio export</title></head><body>${body}</body></html>`;
}
