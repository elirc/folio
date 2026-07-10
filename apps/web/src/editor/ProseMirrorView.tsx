import { useEffect, useRef, useState, type CSSProperties } from "react";
import { EditorView } from "prosemirror-view";
import { EditorState } from "prosemirror-state";
import { keymap } from "prosemirror-keymap";
import * as Y from "yjs";
import { ySyncPlugin, yCursorPlugin, yUndoPlugin, undo, redo, ySyncPluginKey, absolutePositionToRelativePosition } from "y-prosemirror";
import { folioSchema, folioEditingPlugins, filterSlashItems, insertImage, type SlashItem } from "@folio/editor";
import { toB64, type PresenceUser } from "@folio/collab";
import { blockHandlesPlugin } from "./blockHandles";
import { createCollab, type CollabSession } from "./collab";
import { uploadImage } from "../lib/api";

/**
 * The React ⇄ ProseMirror boundary (S07). The editor now edits a **CRDT**: `ySyncPlugin` binds the Y.Doc's
 * XML fragment to ProseMirror, so every PM transaction becomes a Yjs update (exactly the ops you built by
 * hand in crdt-101). `yCursorPlugin` renders remote carets from the awareness channel; `yUndoPlugin` gives
 * per-user undo (prosemirror-history can't, on a shared doc). We still layer Folio's own editing plugins
 * (input rules, block/mark keymap, block handles) on top — the collaboration is orthogonal to the editing.
 *
 * The golden rule is unchanged: don't fight ProseMirror's DOM. The Y.Doc is the source of truth; content
 * arrives when the provider finishes syncing with the server.
 */
export function ProseMirrorView(props: {
  docId: string;
  user: PresenceUser;
  onPresence?: (users: PresenceUser[]) => void;
  onStatus?: (status: { online: boolean }) => void;
  /** Called on selection change with the encoded RELATIVE anchor for the current selection (null if empty). */
  onSelectionAnchor?: (anchor: string | null) => void;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const collabRef = useRef<CollabSession | null>(null);
  const [slash, setSlash] = useState<{ query: string; from: number; top: number; left: number } | null>(null);
  const [slashIdx, setSlashIdx] = useState(0);

  // (Re)create the whole editor when the document or user changes: a new Y.Doc, a new provider, a new view.
  useEffect(() => {
    if (!mountRef.current) return;
    const collab = createCollab(props.docId, props.user);
    collabRef.current = collab;
    if (props.onPresence) collab.onPresence(props.onPresence);
    if (props.onStatus) collab.onStatus(props.onStatus);

    const state = EditorState.create({
      schema: folioSchema,
      plugins: [
        ySyncPlugin(collab.fragment),
        yCursorPlugin(collab.awareness),
        yUndoPlugin(),
        keymap({ "Mod-z": undo, "Mod-y": redo, "Mod-Shift-z": redo }),
        ...folioEditingPlugins(),
        blockHandlesPlugin(),
      ],
    });
    const view = new EditorView(mountRef.current, {
      state,
      dispatchTransaction(tr) {
        view.updateState(view.state.apply(tr));
        updateSlash(view);
        if (props.onSelectionAnchor) props.onSelectionAnchor(encodeSelectionAnchor(view, collab.fragment));
      },
      // Image paste/drop → upload → insert (unchanged from S04; the collab layer is orthogonal).
      handlePaste(v, event) {
        const file = imageFrom(event.clipboardData?.files);
        if (!file) return false;
        void uploadAndInsert(v, file);
        return true;
      },
      handleDrop(v, event) {
        const file = imageFrom((event as DragEvent).dataTransfer?.files);
        if (!file) return false;
        void uploadAndInsert(v, file);
        return true;
      },
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
      collab.destroy();
      collabRef.current = null;
    };
  }, [props.docId, props.user.id]);

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

/**
 * Encode the current selection as a Yjs RELATIVE position (S09). Maps the ProseMirror position to the Y
 * fragment via y-prosemirror's binding, so the anchor tracks CRDT identity — it survives concurrent edits
 * (flaw #3's fix). Returns null for an empty selection or before the binding is ready.
 */
function encodeSelectionAnchor(view: EditorView, fragment: Y.XmlFragment): string | null {
  const { from, empty } = view.state.selection;
  if (empty) return null;
  const binding = ySyncPluginKey.getState(view.state)?.binding;
  if (!binding) return null;
  const rel = absolutePositionToRelativePosition(from, fragment, binding.mapping);
  return toB64(Y.encodeRelativePosition(rel));
}

/** First image file in a FileList, if any. */
function imageFrom(files: FileList | null | undefined): File | null {
  if (!files) return null;
  for (const f of Array.from(files)) if (f.type.startsWith("image/")) return f;
  return null;
}

/** Upload an image and insert it at the current selection. */
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
