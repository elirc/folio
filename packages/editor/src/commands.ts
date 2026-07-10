import { setBlockType, toggleMark, wrapIn } from "prosemirror-commands";
import { wrapInList } from "prosemirror-schema-list";
import type { Command } from "prosemirror-state";
import { folioSchema, type BlockType } from "./schema";
import { makeBlockId } from "./blockId";

/**
 * Editor commands (S03). Each is a ProseMirror `Command`: `(state, dispatch?) => boolean`. Called with no
 * dispatch it reports "would this apply here?" (used to grey out menu items); called with dispatch it emits
 * the transaction. This is the vocabulary the slash menu, keymap, and toolbar all share.
 */

const s = folioSchema;

/** Turn the current textblock into a heading of `level` (1–3). */
export function toHeading(level: 1 | 2 | 3): Command {
  return setBlockType(s.nodes.heading, { level, blockId: makeBlockId() });
}

/** Back to a plain paragraph. */
export const toParagraph: Command = setBlockType(s.nodes.paragraph, { blockId: makeBlockId() });

/** Turn into a code block. */
export const toCodeBlock: Command = setBlockType(s.nodes.code_block, { blockId: makeBlockId() });

/** Wrap the selection in a blockquote. */
export const toBlockquote: Command = wrapIn(s.nodes.blockquote);

/** Wrap the current block(s) in a bullet / ordered / todo list. */
export const toBulletList: Command = wrapInList(s.nodes.bullet_list);
export const toOrderedList: Command = wrapInList(s.nodes.ordered_list);
export const toTodoList: Command = wrapInList(s.nodes.todo_list);

/** Insert a divider at the cursor. */
export const insertDivider: Command = (state, dispatch) => {
  if (dispatch) dispatch(state.tr.replaceSelectionWith(s.nodes.divider.create({ blockId: makeBlockId() })));
  return true;
};

/** Insert an image block (S04). `src` is a StorageService URL returned by the upload endpoint. */
export function insertImage(src: string, alt = ""): Command {
  return (state, dispatch) => {
    if (dispatch) dispatch(state.tr.replaceSelectionWith(s.nodes.image.create({ src, alt, blockId: makeBlockId() })));
    return true;
  };
}

/** Inline mark toggles. */
export const toggleBold: Command = toggleMark(s.marks.strong);
export const toggleItalic: Command = toggleMark(s.marks.em);
export const toggleCode: Command = toggleMark(s.marks.code);

/** A slash-menu entry: how to show it, and the command that runs it. */
export interface SlashItem {
  type: BlockType | "h1" | "h2" | "h3";
  label: string;
  keywords: string[];
  command: Command;
}

/** The slash-menu catalogue. The UI filters this by the query after `/`. */
export const SLASH_ITEMS: SlashItem[] = [
  { type: "paragraph", label: "Text", keywords: ["paragraph", "text", "plain"], command: toParagraph },
  { type: "h1", label: "Heading 1", keywords: ["h1", "title", "heading"], command: toHeading(1) },
  { type: "h2", label: "Heading 2", keywords: ["h2", "subtitle", "heading"], command: toHeading(2) },
  { type: "h3", label: "Heading 3", keywords: ["h3", "heading"], command: toHeading(3) },
  { type: "bullet_list", label: "Bulleted list", keywords: ["bullet", "unordered", "ul", "list"], command: toBulletList },
  { type: "ordered_list", label: "Numbered list", keywords: ["ordered", "number", "ol", "list"], command: toOrderedList },
  { type: "todo_list", label: "To-do list", keywords: ["todo", "task", "checkbox", "check"], command: toTodoList },
  { type: "blockquote", label: "Quote", keywords: ["quote", "blockquote", "callout"], command: toBlockquote },
  { type: "code_block", label: "Code", keywords: ["code", "snippet", "pre"], command: toCodeBlock },
  { type: "divider", label: "Divider", keywords: ["divider", "hr", "rule", "separator"], command: insertDivider },
];

/** Filter the slash catalogue by a free-text query (label + keyword match). */
export function filterSlashItems(query: string): SlashItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return SLASH_ITEMS;
  return SLASH_ITEMS.filter(
    (it) => it.label.toLowerCase().includes(q) || it.keywords.some((k) => k.includes(q)),
  );
}
