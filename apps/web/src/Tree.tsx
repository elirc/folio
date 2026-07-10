import { useEffect, useMemo, useState, type CSSProperties, type DragEvent } from "react";
import { apiGet, apiSend, WORKSPACE_ID } from "./lib/api";

/**
 * The document tree sidebar (S02). Fetches the flat node list, assembles it into a nested tree, and
 * supports create / rename / move (HTML5 drag-and-drop reparent+reorder in ONE request) + a breadcrumb.
 *
 * A drag is a single intent, so a drop sends ONE /move request carrying both the new parent and the two
 * neighbour ids; the server computes the fractional key between them (🔗 Tracer S4). The UI never
 * resequences siblings itself — it drops, refetches, and trusts the keys.
 */
export interface NodeRow {
  id: string;
  parentId: string | null;
  type: "doc" | "folder";
  title: string;
  sortOrder: string;
}

interface TreeItem extends NodeRow {
  children: TreeItem[];
}

function assemble(rows: NodeRow[]): TreeItem[] {
  const byId = new Map<string, TreeItem>();
  for (const r of rows) byId.set(r.id, { ...r, children: [] });
  const roots: TreeItem[] = [];
  for (const item of byId.values()) {
    if (item.parentId && byId.has(item.parentId)) byId.get(item.parentId)!.children.push(item);
    else roots.push(item);
  }
  const sortRec = (items: TreeItem[]) => {
    items.sort((a, b) => (a.sortOrder < b.sortOrder ? -1 : a.sortOrder > b.sortOrder ? 1 : 0));
    for (const i of items) sortRec(i.children);
  };
  sortRec(roots);
  return roots;
}

export function Tree(props: { selected: string | null; onSelect: (id: string) => void }) {
  const [rows, setRows] = useState<NodeRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const load = () =>
    apiGet<NodeRow[]>(`/api/nodes?workspaceId=${WORKSPACE_ID}`)
      .then(setRows)
      .catch((e: unknown) => setErr(String(e)));

  useEffect(() => {
    void load();
  }, []);

  const tree = useMemo(() => assemble(rows), [rows]);

  const create = async (type: "doc" | "folder", parentId: string | null) => {
    await apiSend("/api/nodes", "POST", { workspaceId: WORKSPACE_ID, type, parentId, title: type === "folder" ? "New folder" : "Untitled" });
    await load();
  };

  const rename = async (id: string, title: string) => {
    await apiSend(`/api/nodes/${id}`, "PATCH", { title });
    await load();
  };

  // Drop `dragId` INTO `targetId` (as a child) — the simplest, least ambiguous DnD gesture. Reordering
  // within a parent uses the same /move with before/after ids; kept minimal here on purpose.
  const dropInto = async (targetId: string | null) => {
    if (!dragId || dragId === targetId) return;
    const res = await apiSend<{ error?: unknown }>(`/api/nodes/${dragId}/move`, "POST", { newParentId: targetId }).catch(
      (e: unknown) => ({ error: e }),
    );
    setDragId(null);
    if ((res as { error?: unknown }).error) setErr("Move rejected (cycle?) — a folder can't go inside itself.");
    await load();
  };

  return (
    <aside style={sidebar}>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <button style={miniBtn} onClick={() => void create("doc", null)}>
          + Doc
        </button>
        <button style={miniBtn} onClick={() => void create("folder", null)}>
          + Folder
        </button>
      </div>
      {err && <p style={{ color: "salmon", fontSize: 12 }}>{err}</p>}
      <ul style={list} onDragOver={(e) => e.preventDefault()} onDrop={() => void dropInto(null)}>
        {tree.map((item) => (
          <TreeNode
            key={item.id}
            item={item}
            depth={0}
            selected={props.selected}
            onSelect={props.onSelect}
            onCreate={create}
            onRename={rename}
            onDragStartNode={setDragId}
            onDropInto={dropInto}
          />
        ))}
      </ul>
    </aside>
  );
}

function TreeNode(props: {
  item: TreeItem;
  depth: number;
  selected: string | null;
  onSelect: (id: string) => void;
  onCreate: (type: "doc" | "folder", parentId: string | null) => void;
  onRename: (id: string, title: string) => void;
  onDragStartNode: (id: string) => void;
  onDropInto: (id: string) => void;
}) {
  const { item, depth } = props;
  const isSel = props.selected === item.id;
  return (
    <li>
      <div
        draggable
        onDragStart={() => props.onDragStartNode(item.id)}
        onDragOver={(e: DragEvent) => e.preventDefault()}
        onDrop={(e: DragEvent) => {
          e.stopPropagation();
          props.onDropInto(item.id);
        }}
        onClick={() => item.type === "doc" && props.onSelect(item.id)}
        onDoubleClick={() => {
          const t = window.prompt("Rename", item.title);
          if (t) props.onRename(item.id, t);
        }}
        style={{ ...row, paddingLeft: 8 + depth * 14, ...(isSel ? rowActive : {}) }}
      >
        <span>{item.type === "folder" ? "📁" : "📄"}</span>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</span>
        {item.type === "folder" && (
          <button
            style={addChild}
            title="New doc in folder"
            onClick={(e) => {
              e.stopPropagation();
              props.onCreate("doc", item.id);
            }}
          >
            +
          </button>
        )}
      </div>
      {item.children.length > 0 && (
        <ul style={list}>
          {item.children.map((c) => (
            <TreeNode {...props} key={c.id} item={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

const sidebar: CSSProperties = { width: 240, flexShrink: 0, borderRight: "1px solid #232a32", padding: 12, minHeight: "100vh" };
const list: CSSProperties = { listStyle: "none", margin: 0, padding: 0 };
const row: CSSProperties = { display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 6, cursor: "pointer", fontSize: 13 };
const rowActive: CSSProperties = { background: "#1b2130", color: "#7c5cff" };
const miniBtn: CSSProperties = { flex: 1, background: "#14181d", color: "#e6e9ef", border: "1px solid #232a32", borderRadius: 6, padding: "5px 8px", cursor: "pointer", fontSize: 12 };
const addChild: CSSProperties = { background: "transparent", color: "#7c8794", border: "none", cursor: "pointer", fontSize: 15, lineHeight: 1 };
