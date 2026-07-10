import { useEffect, useState, type CSSProperties } from "react";
import { apiGet } from "./lib/api";
import { Editor } from "./Editor";
import { Tree } from "./Tree";
import { Crdt101Lab } from "./crdt101/Crdt101Lab";

interface Crumb {
  id: string;
  title: string;
}

/**
 * S02 layout: tree sidebar + a breadcrumb + the (still-placeholder) editor. The breadcrumb is fed by the
 * API's ancestor walk (`/breadcrumb`) — the same `ancestorsOf` pure function the tests cover, run server-
 * side. The editor is unchanged from S01 (a labeled textarea); ProseMirror is S03.
 */
export function App() {
  const [selected, setSelected] = useState<string | null>(null);
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  const [showLab, setShowLab] = useState(false);

  useEffect(() => {
    if (!selected) return;
    void apiGet<Crumb[]>(`/api/nodes/${selected}/breadcrumb`)
      .then(setCrumbs)
      .catch(() => setCrumbs([]));
  }, [selected]);

  return (
    <div style={{ display: "flex" }}>
      <Tree selected={selected} onSelect={setSelected} />
      <main style={{ flex: 1, maxWidth: 820, margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1 style={{ color: "#7c5cff", marginTop: 0 }}>Folio</h1>
          <button style={labToggle} onClick={() => setShowLab((v) => !v)}>
            {showLab ? "hide crdt-101 lab" : "🧪 crdt-101 lab"}
          </button>
        </div>
        {showLab && <Crdt101Lab />}
        {selected ? (
          <>
            <nav style={breadcrumb}>
              {crumbs.map((c) => (
                <span key={c.id}>{c.title} / </span>
              ))}
            </nav>
            <Editor docId={selected} />
          </>
        ) : (
          <p style={{ color: "#7c8794" }}>Pick a doc from the tree, or create one.</p>
        )}
      </main>
    </div>
  );
}

const breadcrumb: CSSProperties = { color: "#7c8794", fontSize: 12, margin: "0 0 12px" };
const labToggle: CSSProperties = {
  background: "transparent",
  color: "#7c8794",
  border: "1px solid #232a32",
  borderRadius: 6,
  padding: "3px 8px",
  cursor: "pointer",
  fontSize: 12,
};
