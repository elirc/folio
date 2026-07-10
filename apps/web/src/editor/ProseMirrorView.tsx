import { useEffect, useRef, useState, type CSSProperties } from "react";
import { EditorView } from "prosemirror-view";
import { EditorState } from "prosemirror-state";
import {
  createEditorState,
  docFromJSON,
  docToJSON,
  filterSlashItems,
  insertImage,
  type SlashItem,
} from "@folio/editor";
import { uploadImage } from "../lib/api";
import { blockHandlesPlugin } from "./blockHandles";
import { remoteCursorsPlugin, remoteCursorsKey } from "./remoteCursors";
import { NaiveSyncClient, type RemoteCursor, type SyncUser } from "./syncClient";

/** Build the editor state and layer in the view-only plugins (block handles, remote cursors). */
function buildState(initialJSON: unknown): EditorState {
  const base = createEditorState(docFromJSON(initialJSON));
  return base.reconfigure({ plugins: [...base.plugins, blockHandlesPlugin(), remoteCursorsPlugin()] });
}

/**
 * The React ⇄ ProseMirror boundary (S03). ProseMirror owns its own DOM and document model; React owns the
 * chrome around it (the slash menu popover). The golden rule: **don't fight ProseMirror's DOM.** We mount
 * the view once into a ref'd div and never let React re-render the editor's contents — every change flows
 * through PM transactions, not React state. React only reads derived UI signals (the slash query, cursor
 * coords) out of the view.
 *
 * The document logic (schema, commands, input rules) lives in @folio/editor and is unit-tested in Node.
 * This file is only the *binding* — the swampy contenteditable part we adopt ProseMirror to avoid owning.
 */
export function ProseMirrorView(props: {
  docId: string;
  initialJSON: unknown;
  user: SyncUser;
  onChange: (json: unknown) => void;
  onPresence?: (users: SyncUser[]) => void;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const syncRef = useRef<NaiveSyncClient | null>(null);
  const applyingRemote = useRef(false);
  const remoteCursors = useRef<Map<string, RemoteCursor>>(new Map());
  const [slash, setSlash] = useState<{ query: string; from: number; top: number; left: number } | null>(null);
  const [slashIdx, setSlashIdx] = useState(0);

  // Mount ONCE. initialJSON changes (switching docs) are handled by reconfiguring the view's state below.
  useEffect(() => {
    if (!mountRef.current) return;
    const view = new EditorView(mountRef.current, {
      state: buildState(props.initialJSON),
      dispatchTransaction(tr) {
        const next = view.state.apply(tr);
        view.updateState(next);
        if (tr.docChanged) props.onChange(docToJSON(next.doc));
        // S05 naive sync: broadcast the WHOLE document on every local change (LWW), and our cursor on any
        // selection move. `applyingRemote` guards against re-broadcasting an update we just received.
        if (!applyingRemote.current) {
          if (tr.docChanged) syncRef.current?.sendDoc(docToJSON(next.doc));
          if (tr.selectionSet || tr.docChanged) {
            const s = next.selection;
            syncRef.current?.sendCursor(s.anchor, s.head);
          }
        }
        updateSlash(view);
      },
      // Image paste/drop → upload via StorageService → insert an image block. Returning true tells PM we
      // handled it, so it doesn't also paste the raw file.
      handlePaste(view, event) {
        const file = imageFrom(event.clipboardData?.files);
        if (!file) return false;
        void uploadAndInsert(view, file);
        return true;
      },
      handleDrop(view, event) {
        const file = imageFrom((event as DragEvent).dataTransfer?.files);
        if (!file) return false;
        void uploadAndInsert(view, file);
        return true;
      },
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Mount-once: the effect intentionally has no deps. Doc switches are handled by the effect below.
  }, []);

  // When the selected doc changes, swap the document into the existing view (don't remount — that would
  // fight PM's DOM and lose focus/history).
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.updateState(buildState(props.initialJSON));
  }, [props.initialJSON]);

  // Sync-client lifecycle: one client per (docId, user). Reconnect when the doc changes.
  useEffect(() => {
    const client = new NaiveSyncClient(props.docId, props.user, {
      onDoc: (json) => applyRemoteDoc(json),
      onPresence: (users) => props.onPresence?.(users),
      onCursor: (c) => setRemoteCursor(c),
    });
    syncRef.current = client;
    client.connect();
    return () => {
      client.close();
      syncRef.current = null;
    };
    // Re-create the client only when the doc or user identity changes.
  }, [props.docId, props.user.id]);

  /** LWW: replace the whole document with the incoming one, without re-broadcasting or polluting undo. */
  function applyRemoteDoc(json: unknown) {
    const view = viewRef.current;
    if (!view) return;
    const incoming = docFromJSON(json);
    applyingRemote.current = true;
    const tr = view.state.tr.replaceWith(0, view.state.doc.content.size, incoming.content);
    tr.setMeta("addToHistory", false);
    view.dispatch(tr);
    applyingRemote.current = false;
  }

  /** Collect a remote cursor and push the whole set into the decoration plugin. */
  function setRemoteCursor(c: RemoteCursor) {
    const view = viewRef.current;
    if (!view) return;
    remoteCursors.current.set(c.user.id, c);
    const tr = view.state.tr.setMeta(remoteCursorsKey, { cursors: [...remoteCursors.current.values()] });
    tr.setMeta("addToHistory", false);
    applyingRemote.current = true;
    view.dispatch(tr);
    applyingRemote.current = false;
  }

  // Detect a `/` slash-menu context: an empty-ish block where the text before the cursor is `/query`.
  function updateSlash(view: EditorView) {
    const { $from, empty } = view.state.selection;
    if (!empty) return setSlash(null);
    const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, "￼");
    const m = /(^|\s)\/([\w]*)$/.exec(textBefore);
    if (!m) return setSlash(null);
    const coords = view.coordsAtPos($from.pos);
    setSlashIdx(0);
    setSlash({ query: m[2], from: $from.pos - m[2].length - 1, top: coords.bottom, left: coords.left });
  }

  function chooseSlash(item: SlashItem) {
    const view = viewRef.current;
    if (!view || !slash) return;
    // Remove the `/query` text, then run the block command.
    const tr = view.state.tr.delete(slash.from, view.state.selection.from);
    let state = view.state.apply(tr);
    item.command(state, (t) => {
      state = state.apply(t);
    });
    view.updateState(state);
    view.focus();
    setSlash(null);
  }

  const items = slash ? filterSlashItems(slash.query) : [];

  function onKeyDown(e: React.KeyboardEvent) {
    if (!slash || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSlashIdx((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSlashIdx((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      chooseSlash(items[slashIdx]!);
    } else if (e.key === "Escape") {
      setSlash(null);
    }
  }

  return (
    <div style={{ position: "relative" }} onKeyDown={onKeyDown}>
      <div ref={mountRef} className="folio-editor" style={editorBox} />
      {slash && items.length > 0 && (
        <ul style={{ ...menu, top: slash.top, left: slash.left }}>
          {items.map((it, i) => (
            <li
              key={it.type}
              style={{ ...menuItem, ...(i === slashIdx ? menuItemActive : {}) }}
              onMouseDown={(e) => {
                e.preventDefault();
                chooseSlash(it);
              }}
            >
              {it.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** First image file in a FileList, if any. */
function imageFrom(files: FileList | null | undefined): File | null {
  if (!files) return null;
  for (const f of Array.from(files)) if (f.type.startsWith("image/")) return f;
  return null;
}

/** Upload an image and insert it at the current selection. Errors surface in the console, not a crash. */
async function uploadAndInsert(view: EditorView, file: File): Promise<void> {
  try {
    const url = await uploadImage(file);
    insertImage(url, file.name)(view.state, view.dispatch);
    view.focus();
  } catch (err) {
    console.error("[folio] image upload failed", err);
  }
}

const editorBox: CSSProperties = {
  minHeight: 320,
  background: "#0b0d10",
  color: "#e6e9ef",
  border: "1px solid #232a32",
  borderRadius: 10,
  padding: "14px 16px",
  lineHeight: 1.6,
  outline: "none",
};
const menu: CSSProperties = {
  position: "fixed",
  listStyle: "none",
  margin: 0,
  padding: 4,
  background: "#14181d",
  border: "1px solid #2b333d",
  borderRadius: 8,
  minWidth: 180,
  zIndex: 10,
  boxShadow: "0 8px 24px rgba(0,0,0,.4)",
};
const menuItem: CSSProperties = { padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontSize: 13 };
const menuItemActive: CSSProperties = { background: "#1f2733", color: "#7c5cff" };
