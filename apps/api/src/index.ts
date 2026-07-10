import { buildServer } from "./server";
import { attachWebSocketGateway } from "./ws";
import { env } from "./env";

const app = buildServer();
// Fastify creates its http server eagerly, so we can attach the WS upgrade handler before listen().
attachWebSocketGateway(app.server);

app
  .listen({ port: env.API_PORT, host: "0.0.0.0" })
  .then((address) => {
    console.log(`api listening on ${address}  (ws: ws://localhost:${env.API_PORT}/ws)`);
  })
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
