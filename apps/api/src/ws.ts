import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { prisma } from "@folio/db";
import * as Y from "yjs";
import { canView, canEdit } from "@folio/shared";
import { docFromProseMirrorJSON, encodeState, extractPlainText, type WireMessage } from "@folio/collab";
import { YRooms } from "./yroom";
import { memberRole } from "./lib/permissions";

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
    const memberId = url.searchParams.get("member");
    if (!docId) {
      ws.close();
      return;
    }

    // Permission check AT LOAD: resolve the member's effective role, reject non-viewers, and pass the
    // member's EDIT capability into the room. S13 (flaw #5 harvest): the room re-checks that capability on
    // every mutating message, and a demotion updates it via rooms.setCanEdit — authorization follows the
    // permission change onto the wire, instead of trusting the connect-time snapshot forever.
    void (async () => {
      const role = memberId ? await memberRole(docId, memberId).catch(() => null) : null;
      if (role && !canView(role)) {
        ws.close(1008, "forbidden");
        return;
      }
      await rooms.join(docId, ws, role ? canEdit(role) : true);
    })();

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
  // Also refresh the search projection (S14): decode the state and extract plain text — the derived read-path
  // view, updated on change. Eventually-consistent with the live doc, which is fine for search.
  let searchText = "";
  try {
    const tmp = new Y.Doc();
    Y.applyUpdate(tmp, update);
    searchText = extractPlainText(tmp);
  } catch {
    /* leave searchText as-is on a decode error */
  }
  // Fire-and-forget: keep the socket path non-blocking. A production build would debounce + snapshot.
  void prisma.docState
    .upsert({
      where: { nodeId: docId },
      create: { nodeId: docId, yUpdate: Buffer.from(update), searchText },
      update: { yUpdate: Buffer.from(update), searchText },
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
