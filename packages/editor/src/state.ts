import { EditorState, type Plugin } from "prosemirror-state";
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
 * The editor's plugin stack + state factory (S03). Everything here is DOM-agnostic — no `prosemirror-view`
 * — so a full `EditorState` (schema + history + input rules + keymap) can be built and driven in a Node
 * test. The React view (S03 web) wraps this state; it doesn't own the document logic.
 */
export function folioPlugins(): Plugin[] {
  return [
    folioInputRules,
    history(),
    keymap({
      "Mod-z": undo,
      "Mod-y": redo,
      "Mod-Shift-z": redo,
      "Mod-b": toggleBold,
      "Mod-i": toggleItalic,
      "Mod-e": toggleCode,
      Tab: indent,
      "Shift-Tab": outdent,
      "Mod-.": toggleCollapse, // fold/unfold the current toggle
      // Enter continues a list (or exits an empty item); Backspace at a nested block start outdents.
      // Each falls through to baseKeymap when it doesn't apply.
      Enter: enterInList,
      Backspace: backspaceOutdent,
    }),
    keymap(baseKeymap),
  ];
}

/** Build an EditorState from an existing doc (or a fresh empty one). */
export function createEditorState(doc?: PMNode): EditorState {
  return EditorState.create({ schema: folioSchema, doc: doc ?? emptyDoc(), plugins: folioPlugins() });
}
