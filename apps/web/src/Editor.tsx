import { useEffect, useRef, useState, type CSSProperties } from "react";
import { apiGet, apiSend, WS_URL } from "./lib/api";

/**
 * The "editor" (S01). It is a **textarea**, and that's an honest placeholder — a textarea is NOT the
 * editor (ProseMirror, a real schema-based rich-text model, arrives in S3). It exists so that load, save,
 * and the WebSocket transport are all real *before* the editor's complexity lands. Build the pipes first,
 * then the hard part flows through pipes that already work.
 */
export function Editor({ docId }: { docId: string }) {
  const [text, setText] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [wsEcho, setWsEcho] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    apiGet<{ text: string }>(`/api/docs/${docId}`).then((d) => setText(d.text));
  }, [docId]);

  // The WS is an ECHO for now (S01). It proves the transport; S05 turns it into naive broadcast sync and
  // S07 into a Yjs update relay. We connect once and log what comes back.
  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(typeof e.data === "string" ? e.data : "");
        if (msg?.type === "echo") setWsEcho(String(msg.payload));
      } catch {
        /* ignore */
      }
    };
    return () => ws.close();
  }, []);

  const save = async () => {
    await apiSend(`/api/docs/${docId}`, "PUT", { text });
    setSavedAt(new Date().toLocaleTimeString());
    wsRef.current?.send(JSON.stringify({ type: "echo", payload: "saved" }));
  };

  return (
    <div style={{ marginTop: 12 }}>
      <textarea style={area} value={text} onChange={(e) => setText(e.target.value)} spellCheck />
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
        <button style={button} onClick={() => void save()}>
          Save
        </button>
        {savedAt && <span style={{ color: "#8b93a1", fontSize: 13 }}>saved {savedAt}</span>}
        {wsEcho && <span style={{ color: "#2fbf71", fontSize: 13 }}>ws echo: “{wsEcho}”</span>}
      </div>
      <p style={{ color: "#8b93a1", fontSize: 12, marginTop: 16 }}>
        This is a textarea placeholder. ProseMirror (a real block editor) arrives in Sprint 3; real-time
        collaboration in Sprint 5–7. See ADR-0002 — the CRDT roadmap.
      </p>
    </div>
  );
}

const area: CSSProperties = {
  width: "100%",
  minHeight: 300,
  background: "#0b0d10",
  color: "#e6e9ef",
  border: "1px solid #232a32",
  borderRadius: 10,
  padding: 14,
  font: "14px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace",
  resize: "vertical",
};
const button: CSSProperties = {
  background: "#7c5cff",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "8px 14px",
  cursor: "pointer",
};
