import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet, type EditorView } from "prosemirror-view";
import { moveTopLevelBlock } from "@folio/editor";

/**
 * Block drag-handles (S04) — the VIEW half of block reordering. The document surgery is the pure, tested
 * `moveTopLevelBlock` in @folio/editor; this plugin only turns a screen drag into a (fromIndex, toIndex)
 * pair and calls it.
 *
 * 🔍 SCREEN COORDINATES → DOCUMENT POSITIONS is the whole risk surface. We attach a "⠿" handle before each
 * top-level block via a widget decoration; on drop we resolve the pointer with `view.posAtCoords` and map
 * that position to a top-level block index. All the arithmetic that can go wrong (drop on self, drop at the
 * end) is delegated to the pure core, which unit-tests those cases. This file stays deliberately thin.
 *
 * Production would reach for dnd-kit for accessible keyboard reordering + nesting-during-drag; we keep a
 * native-DnD handle here so the mechanism is legible and dependency-free (ADR notes the upgrade path).
 */
const key = new PluginKey("blockHandles");

let dragFromIndex: number | null = null;

/** The index of the top-level block that contains (or follows) `pos`. `$pos.index(0)` is exactly this. */
function topLevelIndexAtPos(view: EditorView, pos: number): number {
  const clamped = Math.max(0, Math.min(pos, view.state.doc.content.size));
  return view.state.doc.resolve(clamped).index(0);
}

export function blockHandlesPlugin(): Plugin {
  return new Plugin({
    key,
    props: {
      decorations(state) {
        const decos: Decoration[] = [];
        state.doc.forEach((_node, offset) => {
          const handle = () => {
            const el = document.createElement("span");
            el.className = "folio-block-handle";
            el.textContent = "⠿";
            el.draggable = true;
            el.contentEditable = "false";
            el.dataset.pos = String(offset);
            return el;
          };
          decos.push(Decoration.widget(offset + 1, handle, { side: -1, ignoreSelection: true }));
        });
        return DecorationSet.create(state.doc, decos);
      },
      handleDOMEvents: {
        dragstart(view, event) {
          const target = event.target as HTMLElement;
          if (!target.classList?.contains("folio-block-handle")) return false;
          const pos = Number(target.dataset.pos);
          dragFromIndex = view.state.doc.resolve(pos).index(0);
          event.dataTransfer?.setData("text/plain", "folio-block");
          return false;
        },
        drop(view, event) {
          if (dragFromIndex === null) return false;
          const coords = { left: event.clientX, top: event.clientY };
          const at = view.posAtCoords(coords);
          if (!at) return false;
          const toIndex = topLevelIndexAtPos(view, at.pos);
          const tr = moveTopLevelBlock(view.state, dragFromIndex, toIndex);
          dragFromIndex = null;
          if (!tr) return false;
          event.preventDefault();
          view.dispatch(tr);
          return true;
        },
      },
    },
  });
}
