import { useMemo, useState, type CSSProperties } from "react";
import { type PresenceUser } from "@folio/collab";
import { ProseMirrorView } from "./editor/ProseMirrorView";
import { localUser } from "./editor/collab";

/**
 * The editor (S07). Real collaboration, at last. The document is a **Yjs CRDT** bound to ProseMirror; the
 * server holds the authoritative Y.Doc, persists the update log, and relays updates + awareness. There is no
 * client-side whole-doc save anymore — every keystroke is an incremental CRDT update, and persistence is the
 * server appending to the log. The S05 paragraph that vanished now survives (ADR-0008).
 *
 * Presence + cursors ride the awareness channel (ephemeral) — never the doc log.
 */
export function Editor({ docId }: { docId: string }) {
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [online, setOnline] = useState(true);
  const user = useMemo<PresenceUser>(() => localUser(), []);

  return (
    <div style={{ marginTop: 4 }}>
      <div style={presenceBar}>
        {presence.map((u) => (
          <span key={u.id} title={u.name} style={{ ...avatar, background: u.color }}>
            {u.name.slice(0, 1)}
          </span>
        ))}
        {presence.length > 0 && <span style={{ color: "#7c8794", fontSize: 12 }}>{presence.length} here</span>}
        {/* Offline-first status: NOT a merge-conflict dialog — there are no conflicts to resolve (S08). */}
        <span style={{ ...statusPill, ...(online ? onlinePill : offlinePill) }}>
          {online ? "● online" : "○ offline — editing locally, will merge"}
        </span>
      </div>
      <ProseMirrorView key={docId} docId={docId} user={user} onPresence={setPresence} onStatus={(s) => setOnline(s.online)} />
      <p style={hint}>
        Offline-first (Yjs + IndexedDB). Edit with no connection; reconnect and it merges — no lost work, no
        conflict dialog. Open two windows to watch cursors track and edits converge.
      </p>
    </div>
  );
}

const presenceBar: CSSProperties = { display: "flex", gap: 6, alignItems: "center", minHeight: 24, marginBottom: 6 };
const avatar: CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: "50%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "white",
  fontSize: 12,
  fontWeight: 600,
};
const hint: CSSProperties = { color: "#5b6572", fontSize: 12, marginTop: 8 };
const statusPill: CSSProperties = { marginLeft: "auto", fontSize: 11, padding: "2px 8px", borderRadius: 999 };
const onlinePill: CSSProperties = { background: "rgba(47,191,113,.15)", color: "#2fbf71" };
const offlinePill: CSSProperties = { background: "rgba(224,165,75,.15)", color: "#e0a54b" };
