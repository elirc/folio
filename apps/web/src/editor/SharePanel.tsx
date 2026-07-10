import { useEffect, useState, type CSSProperties } from "react";
import { apiGet, apiSend } from "../lib/api";

/**
 * Sharing + effective-access panel (S11). Create/revoke share links (always with an expiry), and — the
 * debuggability feature — show WHY the current member has the access they do ("editor, inherited from the
 * parent folder"). Opaque ACLs generate support tickets; an effective-access explainer answers "why can this
 * person edit?" at a glance.
 */
interface Link {
  id: string;
  token: string;
  role: string;
  expiresAt: string | null;
}
interface Access {
  role: string;
  because: { reason: string; depth: number };
}

export function SharePanel(props: { docId: string; memberId?: string }) {
  const [links, setLinks] = useState<Link[]>([]);
  const [access, setAccess] = useState<Access | null>(null);
  const [role, setRole] = useState("viewer");

  const load = () => {
    void apiGet<Link[]>(`/api/docs/${props.docId}/share`).then(setLinks).catch(() => setLinks([]));
    if (props.memberId)
      void apiGet<Access>(`/api/nodes/${props.docId}/access?memberId=${props.memberId}`)
        .then(setAccess)
        .catch(() => setAccess(null));
  };

  useEffect(() => {
    load();
  }, [props.docId, props.memberId]);

  const create = async () => {
    await apiSend(`/api/docs/${props.docId}/share`, "POST", { role });
    load();
  };
  const revoke = async (id: string) => {
    await apiSend(`/api/share/${id}/revoke`, "POST", {});
    load();
  };

  return (
    <aside style={panel}>
      <div style={{ fontSize: 12, color: "#8b93a1", marginBottom: 8 }}>Share</div>

      {access && (
        <div style={explain}>
          Your access: <b>{access.role}</b>{" "}
          <span style={{ color: "#7c8794" }}>
            ({access.because.reason === "inherited" ? `inherited (${access.because.depth} up)` : access.because.reason})
          </span>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, margin: "10px 0" }}>
        <select style={sel} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="viewer">Viewer</option>
          <option value="commenter">Commenter</option>
          <option value="editor">Editor</option>
        </select>
        <button style={btn} onClick={() => void create()}>
          Create link
        </button>
      </div>

      {links.length === 0 && <p style={{ color: "#5b6572", fontSize: 12 }}>No active share links.</p>}
      {links.map((l) => (
        <div key={l.id} style={row}>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 12 }}>{l.role}</div>
            <div style={{ fontSize: 10, color: "#5b6572", overflow: "hidden", textOverflow: "ellipsis" }}>
              /s/{l.token.slice(0, 10)}… · {l.expiresAt ? `expires ${new Date(l.expiresAt).toLocaleDateString()}` : "no expiry"}
            </div>
          </div>
          <button style={revokeBtn} onClick={() => void revoke(l.id)}>
            Revoke
          </button>
        </div>
      ))}
    </aside>
  );
}

const panel: CSSProperties = { width: 260, flexShrink: 0, borderLeft: "1px solid #232a32", padding: 12 };
const explain: CSSProperties = { fontSize: 12, background: "#14181d", border: "1px solid #232a32", borderRadius: 6, padding: 8 };
const sel: CSSProperties = { flex: 1, background: "#0b0d10", color: "#e6e9ef", border: "1px solid #232a32", borderRadius: 6, padding: "5px", fontSize: 12 };
const btn: CSSProperties = { background: "#7c5cff", color: "white", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12 };
const row: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #232a32", borderRadius: 8, padding: "8px 10px", marginBottom: 6, gap: 6 };
const revokeBtn: CSSProperties = { background: "transparent", color: "#e6584d", border: "1px solid #3a2b2b", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11, flexShrink: 0 };
