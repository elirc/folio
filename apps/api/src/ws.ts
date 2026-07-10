import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { ClientMessageSchema, type ServerMessage } from "@folio/shared";
import { Rooms } from "./rooms";

/**
 * The WebSocket gateway (S05) — a NAIVE real-time relay. Clients `join` a per-document room, then broadcast
 * whole-document updates (last-write-wins, flaw #1), plus best-effort presence and cursors. The server is a
 * dumb fan-out: it does not merge, order, or reconcile anything — it just forwards each whole-doc blob to
 * the other tabs in the room, last one wins.
 *
 * 📘 The server has NO model of concurrency. It can't — it only sees opaque whole-document blobs with a
 * revision counter. That's exactly why LWW is all it can do, and exactly what S07 changes: Yjs updates are
 * *mergeable*, so the relay becomes a real convergence point instead of an overwrite pipe. The room + fan-
 * out framing here survives into S07; only the payload semantics change.
 */
export function attachWebSocketGateway(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });
  const rooms = new Rooms<WebSocket>();

  server.on("upgrade", (req, socket, head) => {
    if (req.url !== "/ws") {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  });

  const send = (ws: WebSocket, msg: ServerMessage) => ws.send(JSON.stringify(msg));
  const broadcastPresence = (docId: string) => {
    const users = rooms.presence(docId);
    for (const m of rooms.peers(docId)) send(m.socket, { type: "presence", docId, users });
  };

  wss.on("connection", (ws: WebSocket) => {
    ws.on("message", (raw) => {
      const parsed = ClientMessageSchema.safeParse(safeJson(raw.toString()));
      if (!parsed.success) return; // ignore anything that isn't a known message
      const msg = parsed.data;

      if (msg.type === "join") {
        rooms.join(msg.docId, ws, msg.user);
        broadcastPresence(msg.docId);
        return;
      }

      // doc_update / cursor: forward verbatim to the OTHER tabs in the same room. No merge, no order.
      const docId = rooms.docOf(ws);
      if (!docId || docId !== msg.docId) return; // must have joined the room it's posting to
      for (const m of rooms.others(docId, ws)) send(m.socket, msg);
    });

    ws.on("close", () => {
      const docId = rooms.leave(ws);
      if (docId) broadcastPresence(docId);
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
