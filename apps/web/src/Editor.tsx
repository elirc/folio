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
      </div>
      <ProseMirrorView key={docId} docId={docId} user={user} onPresence={setPresence} />
      <p style={hint}>
        Real-time collaboration (Yjs). Open two windows and edit together — both edits survive, cursors track.
        The S05 last-write-wins clobber is gone for good.
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
