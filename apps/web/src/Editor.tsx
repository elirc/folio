import { useEffect, useRef, useState, type CSSProperties } from "react";
import { apiGet, apiSend } from "./lib/api";
import { ProseMirrorView } from "./editor/ProseMirrorView";

/**
 * The editor (S03). No longer a textarea — it's a real ProseMirror block editor (schema, slash menu, marks,
 * input rules) bound through <ProseMirrorView/>. Still SINGLE-USER: collaboration is deliberately absent
 * until we've felt its need (S05). The document is stored as ProseMirror JSON in `DocState.text`.
 *
 * ⚠️ SAVE IS DEBOUNCED WHOLE-DOCUMENT. On every change we serialize the entire doc and PUT it. That's
 * perfectly fine for one person and *catastrophic* for two — it is literally last-write-wins on the whole
 * document. S05 will demonstrate exactly this failure with two windows; S07 replaces it with a Yjs update
 * log. This is the line you'll delete. (ADR-0002.)
 */
export function Editor({ docId }: { docId: string }) {
  const [initialJSON, setInitialJSON] = useState<unknown | undefined>(undefined);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setInitialJSON(undefined);
    apiGet<{ text: string }>(`/api/docs/${docId}`).then((d) => {
      // `text` holds ProseMirror JSON (a string) for S03 docs, or plaintext for older S01/S02 rows. Both
      // are handled by docFromJSON downstream; here we just parse the JSON envelope if we can.
      setInitialJSON(parseMaybeJSON(d.text));
    });
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
      {initialJSON !== undefined && <ProseMirrorView initialJSON={initialJSON} onChange={scheduleSave} />}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
        {savedAt && <span style={{ color: "#8b93a1", fontSize: 12 }}>saved {savedAt}</span>}
        <span style={hint}>Type “/” for blocks · **bold** · # heading · - list. Single-user until S05.</span>
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

const hint: CSSProperties = { color: "#5b6572", fontSize: 12 };
