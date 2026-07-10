import { InputRule, inputRules, wrappingInputRule, textblockTypeInputRule } from "prosemirror-inputrules";
import { folioSchema } from "./schema";
import { makeBlockId } from "./blockId";

/**
 * Markdown-style input rules (S03). An input rule is a transaction fired when text matches a pattern as you
 * type: `# ` → heading, `- ` → bullet list, `> ` → quote, ``` ``` `` ``` → code block.
 *
 * 📘 Input rules are just pattern→transaction. They compose with history, so a single undo after `# ` fires
 * puts your literal "# " back — the rule is one transaction, and undo reverts one transaction. That "undo
 * returns the typed characters" behavior is FREE precisely because we build on ProseMirror's transaction
 * model instead of mutating a contenteditable DOM (where undo is a notorious swamp).
 */

const s = folioSchema;

/** `# `, `## `, `### ` → heading of that level. Regex captures 1–3 hashes. */
const headingRule = textblockTypeInputRule(/^(#{1,3})\s$/, s.nodes.heading, (match) => ({
  level: match[1].length,
  blockId: makeBlockId(),
}));

/** `- ` or `* ` → bullet list. wrappingInputRule wraps the current block in a list. */
const bulletListRule = wrappingInputRule(/^\s*([-*])\s$/, s.nodes.bullet_list);

/** `1. ` → ordered list. */
const orderedListRule = wrappingInputRule(
  /^(\d+)\.\s$/,
  s.nodes.ordered_list,
  (match) => ({ order: Number(match[1]) }),
  (match, node) => node.childCount + node.attrs.order === Number(match[1]),
);

/** `[] ` or `[ ] ` → todo list. */
const todoListRule = wrappingInputRule(/^\[\s?\]\s$/, s.nodes.todo_list);

/** `> ` → blockquote. */
const blockquoteRule = wrappingInputRule(/^\s*>\s$/, s.nodes.blockquote);

/** ``` ``` ``` → code block (a custom rule, since code_block replaces the whole textblock type). */
const codeBlockRule = textblockTypeInputRule(/^```$/, s.nodes.code_block, () => ({ blockId: makeBlockId() }));

/** `---` on its own line → a divider, then a fresh paragraph after it. */
const dividerRule = new InputRule(/^---$/, (state, _match, start, end) => {
  const tr = state.tr.replaceRangeWith(start, end, s.nodes.divider.create({ blockId: makeBlockId() }));
  return tr;
});

/** All Folio input rules, as a plugin ready to drop into an EditorState. */
export const folioInputRules = inputRules({
  rules: [headingRule, bulletListRule, orderedListRule, todoListRule, blockquoteRule, codeBlockRule, dividerRule],
});

/** The rule list, exported separately so tests can exercise them without a full plugin/view. */
export const rules = {
  headingRule,
  bulletListRule,
  orderedListRule,
  todoListRule,
  blockquoteRule,
  blockquoteRuleAlias: blockquoteRule,
  codeBlockRule,
  dividerRule,
};
