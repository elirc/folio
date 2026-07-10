import { useEffect, useState, type CSSProperties } from "react";
import { apiGet, apiSend } from "../lib/api";

/**
 * Version history panel (S10). The timeline of checkpoints. "Save version" snapshots the current state;
 * "Restore" applies an old version FORWARD as a new update (CRDT-consistent time travel — not a destructive
 * rewind, so concurrent editors stay converged).
 */
interface Version {
  id: string;
  label: string | null;
  kind: string;
  seq: number;
  createdAt: string;
}

export function VersionHistory(props: { docId: string; onRestore: (b64: string) => void }) {
  const [versions, setVersions] = useState<Version[]>([]);

  const load = () =>
    apiGet<Version[]>(`/api/docs/${props.docId}/versions`)
      .then(setVersions)
      .catch(() => setVersions([]));

  useEffect(() => {
    void load();
  }, [props.docId]);

  const saveVersion = async () => {
    const label = window.prompt("Name this version (blank = automatic checkpoint):") || null;
    await apiSend(`/api/docs/${props.docId}/versions`, "POST", { label });
    await load();
  };

  const restore = async (id: string) => {
    const v = await apiGet<{ yState: string }>(`/api/versions/${id}`);
    props.onRestore(v.yState); // apply forward — history is append-only
  };

  return (
    <aside style={panel}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: "#8b93a1" }}>Version history</span>
        <button style={btn} onClick={() => void saveVersion()}>
          Save version
        </button>
      </div>
      {versions.length === 0 && <p style={{ color: "#5b6572", fontSize: 12 }}>No versions yet.</p>}
      {versions.map((v) => (
        <div key={v.id} style={row}>
          <div>
            <div style={{ fontSize: 13 }}>{v.label ?? `Checkpoint #${v.seq}`}</div>
            <div style={{ fontSize: 11, color: "#5b6572" }}>
              {v.kind} · {new Date(v.createdAt).toLocaleString()}
            </div>
          </div>
          <button style={restoreBtn} onClick={() => void restore(v.id)}>
            Restore
          </button>
        </div>
      ))}
    </aside>
  );
}

const panel: CSSProperties = { width: 260, flexShrink: 0, borderLeft: "1px solid #232a32", padding: 12 };
const btn: CSSProperties = { background: "#7c5cff", color: "white", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11 };
const row: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #232a32", borderRadius: 8, padding: "8px 10px", marginBottom: 6 };
const restoreBtn: CSSProperties = { background: "transparent", color: "#7c8794", border: "1px solid #2b333d", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11 };
