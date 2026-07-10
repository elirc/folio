import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
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
 * The browser collaboration session (S07→S08): one Y.Doc per open document. It is now OFFLINE-FIRST:
 *  1. IndexedDB persistence boots the Y.Doc FROM DISK before we touch the network (🔗 Tracer S7 boot-from-
 *     disk ordering) — the doc is editable instantly, even with no connection.
 *  2. Our custom provider syncs it with the server when online; while offline, edits accumulate in the Y.Doc
 *     and, on reconnect, the SV-exchange sends only the delta (no full resend). No merge dialog: the CRDT
 *     already converged.
 */
export interface CollabSession {
  ydoc: Y.Doc;
  fragment: Y.XmlFragment;
  awareness: ReturnType<typeof createAwareness>;
  onPresence: (cb: (users: PresenceUser[]) => void) => void;
  onStatus: (cb: (status: { online: boolean }) => void) => void;
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

  // OFFLINE-FIRST: boot the doc from IndexedDB before the network. The editor is usable immediately, and any
  // edits made while offline are already in the Y.Doc — reconnection is just a sync, never a "merge".
  const idb = new IndexeddbPersistence(`folio-${docId}`, ydoc);

  let ws: WebSocket | null = null;
  let closed = false;
  let online = false;
  let statusCb: (s: { online: boolean }) => void = () => {};
  let syncCb: (m: SyncMessage) => void = () => {};
  let openCb: () => void = () => {};
  const setOnline = (v: boolean) => {
    online = v;
    statusCb({ online });
  };

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
    ws.onopen = () => {
      setOnline(true);
      openCb(); // Provider sends sync1
    };
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
      setOnline(false);
      if (!closed) setTimeout(connect, 1000); // naive reconnect (Provider re-syncs on reopen)
    };
    ws.onerror = () => setOnline(false);
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
    onStatus(cb) {
      statusCb = cb;
      cb({ online });
    },
    destroy() {
      closed = true;
      awareness.destroy();
      ws?.close();
      void idb.destroy();
      ydoc.destroy();
    },
  };
}
