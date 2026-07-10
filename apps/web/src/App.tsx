import { useEffect, useState, type CSSProperties } from "react";
import { apiGet, apiSend } from "./lib/api";
import { Editor } from "./Editor";

interface DocRow {
  id: string;
  title: string;
  updatedAt: string;
}

export function App() {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = () =>
    apiGet<DocRow[]>("/api/docs")
      .then((rows) => {
        setDocs(rows);
        setSelected((s) => s ?? rows[0]?.id ?? null);
      })
      .catch((e: unknown) => setErr(String(e)));

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    const doc = await apiSend<{ id: string }>("/api/docs", "POST", { title: "Untitled" });
    setSelected(doc.id);
    await load();
  };

  return (
    <main style={{ maxWidth: 760, margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ color: "#7c5cff" }}>Folio</h1>
      {err && <p style={{ color: "salmon" }}>Couldn’t reach the API ({err}). Is it running on :3001?</p>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
        {docs.map((d) => (
          <button
            key={d.id}
            style={{ ...chip, ...(selected === d.id ? chipActive : {}) }}
            onClick={() => setSelected(d.id)}
          >
            {d.title}
          </button>
        ))}
        <button style={chip} onClick={() => void create()}>
          + New doc
        </button>
      </div>
      {selected && <Editor docId={selected} />}
    </main>
  );
}

const chip: CSSProperties = {
  background: "#14181d",
  color: "#e6e9ef",
  border: "1px solid #232a32",
  borderRadius: 999,
  padding: "6px 12px",
  cursor: "pointer",
};
const chipActive: CSSProperties = { borderColor: "#7c5cff", color: "#7c5cff" };
