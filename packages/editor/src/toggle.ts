import type { Command } from "prosemirror-state";

/**
 * Collapsible blocks (S04). Toggling a list item's `collapsed` flips a DOCUMENT attribute — see ADR-0005.
 *
 * ⚠️ THE STATE-CLASSIFICATION DECISION. "Is this toggle open?" could be per-USER view state (my collapse
 * doesn't disturb yours) or DOCUMENT state (everyone sees the same collapsed outline). We chose *document*
 * — a collapsed section is part of the outline's meaning, and that's Notion's model. The cost of getting
 * this wrong is invisible now and disastrous in S07: classify it as view state and it never syncs (fine);
 * classify your scroll position as document state and S07 will sync everyone's scroll to everyone. Every
 * editor datum must be labelled document-or-view *before* collaboration arrives. 🔗 Tracer's durable-vs-
 * ephemeral state lesson, editor-shaped.
 */

/** Toggle the `collapsed` attr of the nearest ancestor list/todo item at the selection. */
export const toggleCollapse: Command = (state, dispatch) => {
  const { $from } = state.selection;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type.name === "list_item" || node.type.name === "todo_item") {
      if (dispatch) {
        const pos = $from.before(d);
        dispatch(state.tr.setNodeAttribute(pos, "collapsed", !node.attrs.collapsed));
      }
      return true;
    }
  }
  return false;
};
