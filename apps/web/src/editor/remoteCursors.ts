import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { RemoteCursor } from "./syncClient";

/**
 * Remote cursors (S05) — best-effort, and deliberately fragile. A cursor arrives as an ABSOLUTE offset into
 * the document. We render a caret widget at that offset.
 *
 * 📘 ABSOLUTE OFFSETS ARE MEANINGLESS UNDER CONCURRENT EDITS. The remote user's `head: 42` was position 42
 * in *their* document a moment ago; if my document has since changed length, position 42 is now somewhere
 * else entirely — so the caret lands on the wrong character, or jumps. We clamp to the doc bounds so it
 * can't crash, but we cannot make it *correct*, because absolute offsets carry no anchor to the text they
 * meant. 🔗 This is the same disease as the S09 comment-anchoring flaw (#3): positions must be *relative*
 * to survive edits, and making them relative is a CRDT capability we don't have until S07.
 */
export const remoteCursorsKey = new PluginKey<DecorationSet>("remoteCursors");

interface SetCursorsMeta {
  cursors: RemoteCursor[];
}

export function remoteCursorsPlugin(): Plugin<DecorationSet> {
  return new Plugin<DecorationSet>({
    key: remoteCursorsKey,
    state: {
      init: () => DecorationSet.empty,
      apply(tr, old) {
        const meta = tr.getMeta(remoteCursorsKey) as SetCursorsMeta | undefined;
        if (meta) {
          const size = tr.doc.content.size;
          const decos = meta.cursors.map((c) => {
            const pos = Math.max(0, Math.min(c.head, size)); // clamp — can't be correct, but won't crash
            return Decoration.widget(pos, () => caret(c), { side: 1, key: c.user.id });
          });
          return DecorationSet.create(tr.doc, decos);
        }
        // Map existing decorations through the change (they drift — that's the point).
        return old.map(tr.mapping, tr.doc);
      },
    },
    props: {
      decorations(state) {
        return remoteCursorsKey.getState(state);
      },
    },
  });
}

/** Build the caret DOM for one remote user. */
function caret(c: RemoteCursor): HTMLElement {
  const el = document.createElement("span");
  el.className = "folio-remote-cursor";
  el.style.borderColor = c.user.color;
  const label = document.createElement("span");
  label.className = "folio-remote-cursor-label";
  label.style.background = c.user.color;
  label.textContent = c.user.name;
  el.appendChild(label);
  return el;
}
