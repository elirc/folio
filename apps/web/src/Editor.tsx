import { useMemo, useRef, useState, type CSSProperties } from "react";
import { type PresenceUser } from "@folio/collab";
import { ProseMirrorView } from "./editor/ProseMirrorView";
import { CommentsPanel } from "./editor/CommentsPanel";
import { VersionHistory } from "./editor/VersionHistory";
import { SharePanel } from "./editor/SharePanel";
import { localUser } from "./editor/collab";
import { API_BASE } from "./lib/api";

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
  const [anchor, setAnchor] = useState<string | null>(null);
  const [panel, setPanel] = useState<"comments" | "history" | "share">("comments");
  const restoreRef = useRef<((b64: string) => void) | null>(null);
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
        {/* S14 export — a lossy projection; the API documents what each format drops. */}
        <a style={exportLink} href={`${API_BASE}/api/docs/${docId}/export?format=markdown`}>⤓ .md</a>
        <a style={exportLink} href={`${API_BASE}/api/docs/${docId}/export?format=html`}>⤓ .html</a>
        {/* Offline-first status: NOT a merge-conflict dialog — there are no conflicts to resolve (S08). */}
        <span style={{ ...statusPill, ...(online ? onlinePill : offlinePill) }}>
          {online ? "● online" : "○ offline — editing locally, will merge"}
        </span>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <ProseMirrorView
            key={docId}
            docId={docId}
            user={user}
            onPresence={setPresence}
            onStatus={(s) => setOnline(s.online)}
            onSelectionAnchor={setAnchor}
            onCollabReady={(api) => (restoreRef.current = api.restoreFromBase64)}
          />
          <p style={hint}>
            Real-time + offline (Yjs). The sync log IS the history — save a version, then time-travel. Restore
            applies an old version forward (never a destructive rewind), so collaborators stay converged.
          </p>
        </div>
        <div style={{ width: 260, flexShrink: 0 }}>
          <div style={tabs}>
            <button style={{ ...tab, ...(panel === "comments" ? tabActive : {}) }} onClick={() => setPanel("comments")}>
              Comments
            </button>
            <button style={{ ...tab, ...(panel === "history" ? tabActive : {}) }} onClick={() => setPanel("history")}>
              History
            </button>
            <button style={{ ...tab, ...(panel === "share" ? tabActive : {}) }} onClick={() => setPanel("share")}>
              Share
            </button>
          </div>
          {panel === "comments" && <CommentsPanel docId={docId} author={user.name} selectionAnchor={anchor} />}
          {panel === "history" && <VersionHistory docId={docId} onRestore={(b64) => restoreRef.current?.(b64)} />}
          {panel === "share" && <SharePanel docId={docId} />}
        </div>
      </div>
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
const tabs: CSSProperties = { display: "flex", gap: 4, borderLeft: "1px solid #232a32", padding: "0 12px 6px" };
const tab: CSSProperties = { flex: 1, background: "transparent", color: "#7c8794", border: "1px solid #232a32", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 12 };
const tabActive: CSSProperties = { color: "#7c5cff", borderColor: "#7c5cff" };
const exportLink: CSSProperties = { fontSize: 11, color: "#7c8794", textDecoration: "none", border: "1px solid #232a32", borderRadius: 6, padding: "2px 6px" };
