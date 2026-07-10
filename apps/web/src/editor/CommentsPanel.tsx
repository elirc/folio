import { useEffect, useState, type CSSProperties } from "react";
import { apiGet, apiSend } from "../lib/api";

/**
 * The comments panel (S09). Comments are anchored to the document by an ENCODED RELATIVE POSITION (computed
 * in the editor, opaque to the server) — so they stay attached to their text as everyone edits (flaw #3's
 * fix). This panel lists them, adds one on the current selection, and resolves threads.
 */
interface Comment {
  id: string;
  author: string;
  body: string;
  resolved: boolean;
  createdAt: string;
}

export function CommentsPanel(props: { docId: string; author: string; selectionAnchor: string | null }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");

  const load = () =>
    apiGet<Comment[]>(`/api/docs/${props.docId}/comments?resolved=false`)
      .then(setComments)
      .catch(() => setComments([]));

  useEffect(() => {
    void load();
  }, [props.docId]);

  const add = async () => {
    if (!draft.trim() || !props.selectionAnchor) return;
    await apiSend(`/api/docs/${props.docId}/comments`, "POST", {
      author: props.author,
      body: draft.trim(),
      anchor: props.selectionAnchor, // the relative anchor for the selected text
    });
    setDraft("");
    await load();
  };

  const resolve = async (id: string) => {
    await apiSend(`/api/comments/${id}/resolve`, "POST", {});
    await load();
  };

  return (
    <aside style={panel}>
      <div style={{ fontSize: 12, color: "#8b93a1", marginBottom: 8 }}>Comments</div>
      <div style={{ marginBottom: 10 }}>
        <textarea
          style={box}
          placeholder={props.selectionAnchor ? "Comment on the selected text…" : "Select text to comment"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={!props.selectionAnchor}
        />
        <button style={btn} onClick={() => void add()} disabled={!props.selectionAnchor || !draft.trim()}>
          Comment
        </button>
      </div>
      {comments.length === 0 && <p style={{ color: "#5b6572", fontSize: 12 }}>No open comments.</p>}
      {comments.map((c) => (
        <div key={c.id} style={card}>
          <div style={{ fontSize: 12, color: "#7c5cff" }}>{c.author}</div>
          <div style={{ fontSize: 13, margin: "2px 0 6px" }}>{c.body}</div>
          <button style={resolveBtn} onClick={() => void resolve(c.id)}>
            Resolve
          </button>
        </div>
      ))}
    </aside>
  );
}

const panel: CSSProperties = { width: 260, flexShrink: 0, borderLeft: "1px solid #232a32", padding: 12 };
const box: CSSProperties = {
  width: "100%",
  minHeight: 48,
  background: "#0b0d10",
  color: "#e6e9ef",
  border: "1px solid #232a32",
  borderRadius: 6,
  padding: 8,
  fontSize: 13,
  resize: "vertical",
};
const btn: CSSProperties = { marginTop: 6, background: "#7c5cff", color: "white", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12 };
const card: CSSProperties = { border: "1px solid #232a32", borderRadius: 8, padding: 10, marginBottom: 8 };
const resolveBtn: CSSProperties = { background: "transparent", color: "#7c8794", border: "1px solid #2b333d", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11 };
