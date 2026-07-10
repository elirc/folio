import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { ClientMessageSchema } from "@folio/shared";

/**
 * The WebSocket gateway (S01) — an ECHO for now. It exists so the transport is real (connect, send,
 * receive) before the hard part lands: this same gateway becomes the naive-broadcast sync in S05, and the
 * Yjs update relay in S07 (ADR-0002). Building the pipe first means every later sprint plugs into a
 * connection that already works. A `{ type: "echo", payload }` message comes back verbatim.
 */
export function attachWebSocketGateway(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    if (req.url !== "/ws") {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  });

  wss.on("connection", (ws: WebSocket) => {
    ws.on("message", (raw) => {
      const parsed = ClientMessageSchema.safeParse(safeJson(raw.toString()));
      if (!parsed.success) return; // ignore anything that isn't a known message
      // Echo it straight back. S05 broadcasts to the room instead; S07 relays Yjs updates.
      ws.send(JSON.stringify(parsed.data));
    });
  });

  return wss;
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return null;
  }
}
