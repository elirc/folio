import * as Y from "yjs";
import { encodeAwarenessUpdate, applyAwarenessUpdate } from "y-protocols/awareness";
import {
  Provider,
  createAwareness,
  setLocalPresence,
  toB64,
  fromB64,
  type Transport,
  type WireMessage,
  type SyncMessage,
  type PresenceUser,
} from "@folio/collab";
import { WS_URL } from "../lib/api";

/**
 * The browser collaboration session (S07): one Y.Doc per open document, wired to the server through our
 * CUSTOM provider over a WebSocket. Document sync flows through the Provider (sync1/sync2/update); presence
 * flows through the awareness channel (ephemeral). We route incoming frames to the right handler.
 */
export interface CollabSession {
  ydoc: Y.Doc;
  fragment: Y.XmlFragment;
  awareness: ReturnType<typeof createAwareness>;
  onPresence: (cb: (users: PresenceUser[]) => void) => void;
  destroy: () => void;
}

/** A stable, silly identity for this browser tab (persisted so reloads keep the same colour/name). */
export function localUser(): PresenceUser {
  const KEY = "folio-user";
  const existing = localStorage.getItem(KEY);
  if (existing) return JSON.parse(existing) as PresenceUser;
  const names = ["Otter", "Heron", "Marmot", "Finch", "Lynx", "Wren"];
  const colors = ["#e6584d", "#2fbf71", "#7c5cff", "#e0a54b", "#3aa0ff", "#d65db1"];
  const i = Math.floor(Math.random() * names.length);
  const user: PresenceUser = { id: crypto.randomUUID(), name: names[i]!, color: colors[i]! };
  localStorage.setItem(KEY, JSON.stringify(user));
  return user;
}

export function createCollab(docId: string, user: PresenceUser): CollabSession {
  const ydoc = new Y.Doc();
  const fragment = ydoc.getXmlFragment("prosemirror");
  const awareness = createAwareness(ydoc);
  setLocalPresence(awareness, user);

  let ws: WebSocket | null = null;
  let closed = false;
  let syncCb: (m: SyncMessage) => void = () => {};
  let openCb: () => void = () => {};

  const wsSend = (m: WireMessage) => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m));
  };

  // The Provider talks to this transport; it only ever sees document-sync messages.
  const transport: Transport = {
    send: (m) => wsSend(m),
    onMessage: (cb) => (syncCb = cb),
    onOpen: (cb) => (openCb = cb),
  };
  const provider = new Provider(ydoc, transport);
  provider.connect();

  // Relay local awareness changes (presence/cursor) to peers — never into the doc.
  awareness.on("update", ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
    const changed = [...added, ...updated, ...removed];
    wsSend({ type: "awareness", payload: toB64(encodeAwarenessUpdate(awareness, changed)) });
  });

  const connect = () => {
    ws = new WebSocket(`${WS_URL}?doc=${encodeURIComponent(docId)}`);
    ws.onopen = () => openCb(); // Provider sends sync1
    ws.onmessage = (e) => {
      let msg: WireMessage;
      try {
        msg = JSON.parse(typeof e.data === "string" ? e.data : "") as WireMessage;
      } catch {
        return;
      }
      if (msg.type === "awareness") applyAwarenessUpdate(awareness, fromB64(msg.payload), "remote");
      else syncCb(msg);
    };
    ws.onclose = () => {
      if (!closed) setTimeout(connect, 1000); // naive reconnect (Provider re-syncs on reopen)
    };
  };
  connect();

  return {
    ydoc,
    fragment,
    awareness,
    onPresence(cb) {
      const emit = () => {
        const seen = new Map<string, PresenceUser>();
        for (const s of awareness.getStates().values()) {
          const u = (s as { user?: PresenceUser }).user;
          if (u) seen.set(u.id, u);
        }
        cb([...seen.values()]);
      };
      awareness.on("change", emit);
      emit();
    },
    destroy() {
      closed = true;
      awareness.destroy();
      ws?.close();
      ydoc.destroy();
    },
  };
}
