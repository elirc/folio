import type { FastifyInstance } from "fastify";
import {
  MemoryStorage,
  assertUploadAllowed,
  keyForUpload,
  isAllowedImageType,
  UploadRejected,
  type StorageService,
} from "@folio/storage";

/**
 * Image upload (S04). Depends only on the StorageService *interface* (🔗 ported from Meridian) — here we
 * back it with in-memory storage for dev/test; production swaps in an S3/R2-backed impl behind the same
 * interface, and this handler doesn't change. Validation (type + size) happens at the edge, before bytes
 * ever reach storage, so a bad upload is a fast 4xx, not a stored-then-rejected mess.
 */
const storage: StorageService = new MemoryStorage();

export async function uploadRoutes(app: FastifyInstance): Promise<void> {
  // Collect binary bodies as raw buffers. The catch-all only fires for content types with no specific
  // parser (application/json keeps its built-in parser), so unknown types reach our handler and get a
  // proper typed 415 instead of Fastify's generic one.
  app.addContentTypeParser("*", { parseAs: "buffer" }, (_req, body, done) => done(null, body));

  app.post("/api/uploads", async (req, reply) => {
    const contentType = req.headers["content-type"]?.split(";")[0]?.trim() ?? "";
    const body = req.body as Buffer | undefined;
    const bytes = body instanceof Buffer ? new Uint8Array(body) : new Uint8Array();

    try {
      assertUploadAllowed(contentType, bytes.byteLength);
    } catch (err) {
      if (err instanceof UploadRejected) {
        return reply.code(err.code === "TOO_LARGE" ? 413 : 415).send({ error: { code: err.code, message: err.message } });
      }
      throw err;
    }

    // isAllowedImageType narrowed the type inside assert; re-check for the key helper's literal type.
    if (!isAllowedImageType(contentType)) {
      return reply.code(415).send({ error: { code: "UNSUPPORTED_TYPE", message: contentType } });
    }
    const key = keyForUpload(contentType);
    const url = await storage.put(key, bytes, contentType);
    return reply.code(201).send({ url, key });
  });
}
