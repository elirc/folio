import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import { env } from "./env";
import { healthRoutes } from "./routes/health";
import { docRoutes } from "./routes/docs";
import { nodeRoutes } from "./routes/nodes";
import { aclRoutes } from "./routes/acl";
import { uploadRoutes } from "./routes/uploads";
import { commentRoutes } from "./routes/comments";
import { versionRoutes } from "./routes/versions";
import { shareRoutes } from "./routes/share";

/**
 * Build (but don't start) the app so tests can boot it in-process via `app.inject(...)`.
 * Handlers throw typed errors; we translate them to a JSON envelope once, here at the edge.
 */
export function buildServer(): FastifyInstance {
  const app = Fastify({
    logger: process.env.NODE_ENV === "production" ? { level: "info" } : false,
  });

  // The Vite web app is a different origin in dev — allow it.
  void app.register(cors, { origin: env.WEB_URL });

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError) {
      void reply.code(400).send({ error: { code: "VALIDATION", message: "Invalid request" } });
      return;
    }
    void reply.code(500).send({ error: { code: "INTERNAL", message: "Internal error" } });
  });

  void app.register(healthRoutes);
  void app.register(docRoutes);
  void app.register(nodeRoutes);
  void app.register(aclRoutes);
  void app.register(uploadRoutes);
  void app.register(commentRoutes);
  void app.register(versionRoutes);
  void app.register(shareRoutes);
  return app;
}
