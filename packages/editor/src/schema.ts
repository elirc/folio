import { Schema, type NodeSpec, type MarkSpec } from "prosemirror-model";

/**
 * The Folio document schema (S03) — [A]-authored, because a ProseMirror schema is the load-bearing contract
 * of the whole editor and deserves care. It's DOM-agnostic (no `prosemirror-view` import here), which is
 * exactly why it — and everything built on `EditorState` — is unit-testable in Node without a browser.
 *
 * 📘 A SCHEMA MAKES ILLEGAL DOCUMENTS UNREPRESENTABLE. Every prior course reached for "make illegal states
 * impossible" in its type design; a PM schema is that instinct applied to a *document*. The `content`
 * expressions below are a grammar: a `doc` is `block+`, a `list_item` is `paragraph block*`, a `todo_item`
 * carries a boolean attr. A transaction that would violate the grammar simply cannot be constructed — you
 * never validate "is this a legal doc?" at runtime because the model won't let you build an illegal one.
 *
 * 🔗 This is also why we adopt ProseMirror instead of hand-rolling contenteditable (ADR-0004): it hands us
 * a real document model + transactions + this schema for free. We spend our novelty budget on the actual
 * novelty (collaboration, S05+), not on re-deriving a rich-text data model badly.
 */

const nodes: Record<string, NodeSpec> = {
  doc: { content: "block+" },

  paragraph: {
    group: "block",
    content: "inline*",
    attrs: { blockId: { default: null } },
    parseDOM: [{ tag: "p" }],
    toDOM: (node) => ["p", { "data-block-id": node.attrs.blockId as string }, 0],
  },

  heading: {
    group: "block",
    content: "inline*",
    // level 1..3 only — Folio is a doc tool, not a word processor; scope discipline (S03 recap).
    attrs: { level: { default: 1 }, blockId: { default: null } },
    defining: true,
    parseDOM: [
      { tag: "h1", attrs: { level: 1 } },
      { tag: "h2", attrs: { level: 2 } },
      { tag: "h3", attrs: { level: 3 } },
    ],
    toDOM: (node) => [`h${node.attrs.level as number}`, { "data-block-id": node.attrs.blockId as string }, 0],
  },

  blockquote: {
    group: "block",
    content: "block+",
    attrs: { blockId: { default: null } },
    parseDOM: [{ tag: "blockquote" }],
    toDOM: (node) => ["blockquote", { "data-block-id": node.attrs.blockId as string }, 0],
  },

  code_block: {
    group: "block",
    content: "text*",
    marks: "", // no inline marks inside code
    code: true,
    defining: true,
    attrs: { blockId: { default: null } },
    parseDOM: [{ tag: "pre", preserveWhitespace: "full" }],
    toDOM: (node) => ["pre", { "data-block-id": node.attrs.blockId as string }, ["code", 0]],
  },

  bullet_list: {
    group: "block",
    content: "list_item+",
    attrs: { blockId: { default: null } },
    parseDOM: [{ tag: "ul" }],
    toDOM: (node) => ["ul", { "data-block-id": node.attrs.blockId as string }, 0],
  },

  ordered_list: {
    group: "block",
    content: "list_item+",
    attrs: { order: { default: 1 }, blockId: { default: null } },
    parseDOM: [{ tag: "ol" }],
    toDOM: (node) => ["ol", { "data-block-id": node.attrs.blockId as string }, 0],
  },

  todo_list: {
    group: "block",
    content: "todo_item+",
    attrs: { blockId: { default: null } },
    parseDOM: [{ tag: "ul[data-todo]" }],
    toDOM: (node) => ["ul", { "data-todo": "true", "data-block-id": node.attrs.blockId as string }, 0],
  },

  list_item: {
    content: "paragraph block*",
    defining: true,
    // `collapsed` is DOCUMENT state (ADR-0005): it's part of the outline's meaning, so it syncs to every
    // collaborator (Notion's choice). It is NOT per-user view state — that distinction is the whole point.
    attrs: { collapsed: { default: false } },
    parseDOM: [{ tag: "li", getAttrs: (el) => ({ collapsed: (el as HTMLElement).getAttribute("data-collapsed") === "true" }) }],
    toDOM: (node) => ["li", node.attrs.collapsed ? { "data-collapsed": "true" } : {}, 0],
  },

  todo_item: {
    content: "paragraph block*",
    defining: true,
    attrs: { checked: { default: false }, collapsed: { default: false } },
    parseDOM: [
      {
        tag: "li[data-checked]",
        getAttrs: (el) => ({
          checked: (el as HTMLElement).getAttribute("data-checked") === "true",
          collapsed: (el as HTMLElement).getAttribute("data-collapsed") === "true",
        }),
      },
    ],
    toDOM: (node) => [
      "li",
      { "data-checked": String(node.attrs.checked), ...(node.attrs.collapsed ? { "data-collapsed": "true" } : {}) },
      0,
    ],
  },

  image: {
    group: "block",
    // A media block. `src` is a StorageService URL (S04). `alt` is accessibility text (enforced in S14).
    attrs: { src: {}, alt: { default: "" }, blockId: { default: null } },
    draggable: true,
    parseDOM: [
      {
        tag: "img[src]",
        getAttrs: (el) => ({ src: (el as HTMLElement).getAttribute("src"), alt: (el as HTMLElement).getAttribute("alt") ?? "" }),
      },
    ],
    toDOM: (node) => ["img", { src: node.attrs.src as string, alt: node.attrs.alt as string, "data-block-id": node.attrs.blockId as string }],
  },

  divider: {
    group: "block",
    attrs: { blockId: { default: null } },
    parseDOM: [{ tag: "hr" }],
    toDOM: () => ["hr"],
  },

  text: { group: "inline" },
};

const marks: Record<string, MarkSpec> = {
  strong: {
    parseDOM: [{ tag: "strong" }, { tag: "b" }, { style: "font-weight=bold" }],
    toDOM: () => ["strong", 0],
  },
  em: {
    parseDOM: [{ tag: "em" }, { tag: "i" }, { style: "font-style=italic" }],
    toDOM: () => ["em", 0],
  },
  code: {
    parseDOM: [{ tag: "code" }],
    toDOM: () => ["code", 0],
  },
  link: {
    attrs: { href: {}, title: { default: null } },
    inclusive: false,
    parseDOM: [{ tag: "a[href]", getAttrs: (el) => ({ href: (el as HTMLElement).getAttribute("href"), title: (el as HTMLElement).getAttribute("title") }) }],
    toDOM: (mark) => ["a", { href: mark.attrs.href as string, title: mark.attrs.title as string }, 0],
  },
};

export const folioSchema = new Schema({ nodes, marks });

/** The block node type names a slash menu / block toolbar can offer. */
export const BLOCK_TYPES = [
  "paragraph",
  "heading",
  "bullet_list",
  "ordered_list",
  "todo_list",
  "blockquote",
  "code_block",
  "divider",
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];
