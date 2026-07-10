import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { prisma } from "@folio/db";
import { docFromProseMirrorJSON, encodeState, type WireMessage } from "@folio/collab";
import { YRooms } from "./yroom";

/**
 * The WebSocket gateway (S07) — a real Yjs sync endpoint. S05 was a dumb whole-doc LWW relay; now the server
 * runs the Yjs sync protocol against an authoritative Y.Doc per document (see yroom.ts), persists the update
 * log, and relays incremental updates + awareness. The transport (rooms, upgrade, fan-out) is the same pipe
 * built in S01/S05 — only the payload semantics changed, as promised.
 *
 * The URL carries the document: /ws?doc=<id>. First message from a client is sync1; the server answers with
 * the delta it lacks.
 */
export function attachWebSocketGateway(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });
  const rooms = new YRooms(loadDocUpdate, persistDocUpdate);

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "", "http://localhost");
    if (url.pathname !== "/ws") {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  });

  wss.on("connection", (ws: WebSocket, req) => {
    const url = new URL(req.url ?? "", "http://localhost");
    const docId = url.searchParams.get("doc");
    if (!docId) {
      ws.close();
      return;
    }
    void rooms.join(docId, ws);

    ws.on("message", (raw) => {
      const msg = safeJson(raw.toString()) as WireMessage | null;
      if (msg && typeof msg.type === "string") rooms.handle(ws, msg);
    });
    ws.on("close", () => rooms.leave(ws));
  });

  return wss;
}

/**
 * Load a document's persisted Yjs state. If it doesn't exist yet, MIGRATE the S03–S06 ProseMirror-JSON in
 * `text` into a Y.Doc (the expand step) and return that — so old documents open seamlessly into the CRDT.
 */
async function loadDocUpdate(docId: string): Promise<Uint8Array | null> {
  const state = await prisma.docState.findUnique({ where: { nodeId: docId }, select: { yUpdate: true, text: true } });
  if (!state) return null;
  if (state.yUpdate) return new Uint8Array(state.yUpdate);
  // Migration: seed a Y.Doc from the old PM-JSON, persist it, and return its encoded state.
  const doc = docFromProseMirrorJSON(parseMaybeJSON(state.text));
  const update = encodeState(doc);
  await persistDocUpdate(docId, update);
  return update;
}

function persistDocUpdate(docId: string, update: Uint8Array): void {
  // Fire-and-forget: keep the socket path non-blocking. A production build would debounce + snapshot.
  void prisma.docState
    .upsert({
      where: { nodeId: docId },
      create: { nodeId: docId, yUpdate: Buffer.from(update) },
      update: { yUpdate: Buffer.from(update) },
    })
    .catch(() => {
      /* best-effort persistence; the in-memory room remains the live source */
    });
}

function parseMaybeJSON(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return null;
  }
}
