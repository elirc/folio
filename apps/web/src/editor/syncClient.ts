import type { ClientMessage, ServerMessage } from "@folio/shared";
import { WS_URL } from "../lib/api";

export interface SyncUser {
  id: string;
  name: string;
  color: string;
}

export interface RemoteCursor {
  user: SyncUser;
  anchor: number;
  head: number;
}

/**
 * The client half of the S05 naive real-time relay. It joins a document room and shuttles WHOLE-DOCUMENT
 * updates (last-write-wins), presence, and cursors. Deliberately dumb — there is no merge here, only send
 * and overwrite. S07 swaps the doc payload for incremental Yjs updates; this client's shape mostly survives.
 */
export class NaiveSyncClient {
  private ws: WebSocket | null = null;
  private rev = 0;
  private closed = false;

  constructor(
    private readonly docId: string,
    private readonly user: SyncUser,
    private readonly handlers: {
      onDoc: (doc: unknown, rev: number) => void;
      onPresence: (users: SyncUser[]) => void;
      onCursor: (cursor: RemoteCursor) => void;
    },
  ) {}

  connect(): void {
    const ws = new WebSocket(WS_URL);
    this.ws = ws;
    ws.onopen = () => this.send({ type: "join", docId: this.docId, user: this.user });
    ws.onmessage = (e) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(typeof e.data === "string" ? e.data : "") as ServerMessage;
      } catch {
        return;
      }
      if (msg.type === "doc_update") this.handlers.onDoc(msg.doc, msg.rev);
      else if (msg.type === "presence") this.handlers.onPresence(msg.users);
      else if (msg.type === "cursor") this.handlers.onCursor({ user: msg.user, anchor: msg.anchor, head: msg.head });
    };
    // Naive reconnect: on close, if we didn't ask to close, try again shortly. (S07 hardens this — a
    // reconnect that drops updates during the gap is its own planted bug there.)
    ws.onclose = () => {
      if (!this.closed) setTimeout(() => this.connect(), 1000);
    };
  }

  /** Broadcast the ENTIRE document (LWW). Called on every debounced change. */
  sendDoc(doc: unknown): void {
    this.send({ type: "doc_update", docId: this.docId, rev: ++this.rev, doc });
  }

  /** Broadcast a cursor as absolute offsets — wrong the instant the doc changes underneath (S05 flaw). */
  sendCursor(anchor: number, head: number): void {
    this.send({ type: "cursor", docId: this.docId, user: this.user, anchor, head });
  }

  close(): void {
    this.closed = true;
    this.ws?.close();
  }

  private send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }
}

/** A stable, silly identity for this browser tab (persisted so reloads keep the same colour/name). */
export function localUser(): SyncUser {
  const KEY = "folio-user";
  const existing = localStorage.getItem(KEY);
  if (existing) return JSON.parse(existing) as SyncUser;
  const names = ["Otter", "Heron", "Marmot", "Finch", "Lynx", "Wren"];
  const colors = ["#e6584d", "#2fbf71", "#7c5cff", "#e0a54b", "#3aa0ff", "#d65db1"];
  const i = Math.floor(Math.random() * names.length);
  const user: SyncUser = { id: crypto.randomUUID(), name: names[i]!, color: colors[i]! };
  localStorage.setItem(KEY, JSON.stringify(user));
  return user;
}
