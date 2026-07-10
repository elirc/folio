import { EditorState, type Command, type Plugin } from "prosemirror-state";
import { history, undo, redo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { Node as PMNode } from "prosemirror-model";
import { folioSchema } from "./schema";
import { folioInputRules } from "./inputRules";
import { toggleBold, toggleItalic, toggleCode } from "./commands";
import { indent, outdent } from "./nesting";
import { toggleCollapse } from "./toggle";
import { enterInList, backspaceOutdent } from "./keyboard";
import { emptyDoc } from "./document";

/**
 * The editor's plugin stack + state factory. Everything here is DOM-agnostic — no `prosemirror-view` — so a
 * full `EditorState` (schema + input rules + keymap) can be built and driven in a Node test.
 *
 * The EDITING plugins (input rules + block/mark keymap) are separated from history on purpose: the single-
 * user path (createEditorState) pairs them with prosemirror-history, while the S07 collaborative path pairs
 * the SAME editing plugins with Yjs's undo (yUndoPlugin) — undo of a shared doc must be per-user, which
 * prosemirror-history can't do but Yjs can. Sharing the editing keymap keeps both paths behaving identically.
 */

/** Block/mark editing shortcuts — NO undo/redo (those differ between the history and Yjs paths). */
export const editingKeymap: Record<string, Command> = {
  "Mod-b": toggleBold,
  "Mod-i": toggleItalic,
  "Mod-e": toggleCode,
  Tab: indent,
  "Shift-Tab": outdent,
  "Mod-.": toggleCollapse, // fold/unfold the current toggle
  Enter: enterInList, // continue a list / exit an empty item
  Backspace: backspaceOutdent, // outdent at a nested block start
};

/** Input rules + editing keymap + base keymap — everything except history/undo. Shared by both paths. */
export function folioEditingPlugins(): Plugin[] {
  return [folioInputRules, keymap(editingKeymap), keymap(baseKeymap)];
}

/** Single-user plugin stack: editing plugins + prosemirror-history undo/redo. */
export function folioPlugins(): Plugin[] {
  return [
    folioInputRules,
    history(),
    keymap({ "Mod-z": undo, "Mod-y": redo, "Mod-Shift-z": redo }),
    keymap(editingKeymap),
    keymap(baseKeymap),
  ];
}

/** Build a single-user EditorState from an existing doc (or a fresh empty one). */
export function createEditorState(doc?: PMNode): EditorState {
  return EditorState.create({ schema: folioSchema, doc: doc ?? emptyDoc(), plugins: folioPlugins() });
}
