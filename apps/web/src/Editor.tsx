import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { apiGet, apiSend } from "./lib/api";
import { ProseMirrorView } from "./editor/ProseMirrorView";
import { localUser, type SyncUser } from "./editor/syncClient";

/**
 * The editor (S05). Now MULTIPLAYER — but naively: whole-document broadcast with last-write-wins (flaw #1,
 * announced). Open this doc in two windows and edit both: watch one window's paragraph vanish. That data
 * loss is the felt problem S06 (toy CRDT) and S07 (Yjs) exist to solve. Presence + cursors are best-effort
 * and also break under concurrency (cursors jump — absolute offsets, ADR-0006).
 *
 * ⚠️ SAVE IS STILL DEBOUNCED WHOLE-DOCUMENT (persistence) AND BROADCAST IS WHOLE-DOCUMENT LWW (sync). Both
 * are the same naïveté at two layers; S07 replaces both with a Yjs update log.
 */
export function Editor({ docId }: { docId: string }) {
  const [initialJSON, setInitialJSON] = useState<unknown | undefined>(undefined);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [presence, setPresence] = useState<SyncUser[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const user = useMemo<SyncUser>(() => localUser(), []);

  useEffect(() => {
    setInitialJSON(undefined);
    setPresence([]);
    apiGet<{ text: string }>(`/api/docs/${docId}`).then((d) => setInitialJSON(parseMaybeJSON(d.text)));
  }, [docId]);

  const scheduleSave = (json: unknown) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void apiSend(`/api/docs/${docId}`, "PUT", { text: JSON.stringify(json) }).then(() =>
        setSavedAt(new Date().toLocaleTimeString()),
      );
    }, 600); // debounce: coalesce a burst of keystrokes into one whole-doc write
  };

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
      {initialJSON !== undefined && (
        <ProseMirrorView
          docId={docId}
          initialJSON={initialJSON}
          user={user}
          onChange={scheduleSave}
          onPresence={setPresence}
        />
      )}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
        {savedAt && <span style={{ color: "#8b93a1", fontSize: 12 }}>saved {savedAt}</span>}
        <span style={hint}>
          Multiplayer (naive, S05): open two windows and watch last-write-wins eat a paragraph. Real
          convergence arrives S06–S07 (ADR-0002/0006).
        </span>
      </div>
    </div>
  );
}

function parseMaybeJSON(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text; // an old plaintext row — docFromJSON migrates it
  }
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
const hint: CSSProperties = { color: "#5b6572", fontSize: 12 };
