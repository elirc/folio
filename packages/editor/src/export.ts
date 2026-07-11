/**
 * Document export (S14). A ProseMirror document → Markdown / HTML, structure-preserving. Pure functions over
 * the PM JSON (no DOM, no Yjs), so they're exhaustively testable in Node.
 *
 * 📘 EVERY EXPORT FORMAT LOSES SOMETHING, AND WE SAY SO. Markdown can't hold comments, suggestions, or block
 * ids; HTML can't hold the collaborative/interactive layer; PDF can't hold anything editable. Export is a
 * *projection* of the document onto a lossy target — the honest move is to document the lossiness (see
 * `EXPORT_LOSSINESS`) rather than pretend a round-trip is clean.
 */

interface PMNodeJSON {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMNodeJSON[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

/** What each format cannot represent — surfaced to the user, not hidden. */
export const EXPORT_LOSSINESS: Record<"markdown" | "html", string[]> = {
  markdown: ["comments", "suggestions (tracked changes)", "block ids", "collaborative cursors", "exact list nesting styles"],
  html: ["comments", "suggestions", "collaborative cursors", "editability"],
};

// ── Markdown ────────────────────────────────────────────────────────────────────────────────────
export function pmToMarkdown(doc: PMNodeJSON): string {
  return (doc.content ?? []).map((n) => blockToMarkdown(n, 0)).join("\n\n").trim() + "\n";
}

function blockToMarkdown(node: PMNodeJSON, depth: number): string {
  const pad = "  ".repeat(depth);
  switch (node.type) {
    case "paragraph":
      return pad + inlineToMarkdown(node.content ?? []);
    case "heading":
      return `${"#".repeat((node.attrs?.level as number) ?? 1)} ${inlineToMarkdown(node.content ?? [])}`;
    case "blockquote":
      return (node.content ?? []).map((c) => `> ${blockToMarkdown(c, depth).replace(/\n/g, "\n> ")}`).join("\n");
    case "code_block":
      return "```\n" + (node.content ?? []).map((c) => c.text ?? "").join("") + "\n```";
    case "divider":
      return "---";
    case "image":
      return `![${(node.attrs?.alt as string) ?? ""}](${(node.attrs?.src as string) ?? ""})`;
    case "bullet_list":
      return (node.content ?? []).map((li) => `${pad}- ${listItemToMarkdown(li, depth)}`).join("\n");
    case "ordered_list":
      return (node.content ?? []).map((li, i) => `${pad}${i + 1}. ${listItemToMarkdown(li, depth)}`).join("\n");
    case "todo_list":
      return (node.content ?? [])
        .map((li) => `${pad}- [${li.attrs?.checked ? "x" : " "}] ${listItemToMarkdown(li, depth)}`)
        .join("\n");
    default:
      return inlineToMarkdown(node.content ?? []);
  }
}

/** A list item's first paragraph inline, plus nested blocks indented one level. */
function listItemToMarkdown(li: PMNodeJSON, depth: number): string {
  const [first, ...rest] = li.content ?? [];
  const head = first ? inlineToMarkdown(first.content ?? []) : "";
  const nested = rest.map((c) => "\n" + blockToMarkdown(c, depth + 1)).join("");
  return head + nested;
}

function inlineToMarkdown(nodes: PMNodeJSON[]): string {
  return nodes
    .map((n) => {
      let t = n.text ?? "";
      for (const m of n.marks ?? []) {
        if (m.type === "strong") t = `**${t}**`;
        else if (m.type === "em") t = `*${t}*`;
        else if (m.type === "code") t = `\`${t}\``;
        else if (m.type === "link") t = `[${t}](${(m.attrs?.href as string) ?? ""})`;
        // suggestion_* marks are export-lossy (see EXPORT_LOSSINESS) — dropped intentionally.
      }
      return t;
    })
    .join("");
}

// ── HTML ────────────────────────────────────────────────────────────────────────────────────────
export function pmToHtml(doc: PMNodeJSON): string {
  return (doc.content ?? []).map(blockToHtml).join("\n");
}

function blockToHtml(node: PMNodeJSON): string {
  switch (node.type) {
    case "paragraph":
      return `<p>${inlineToHtml(node.content ?? [])}</p>`;
    case "heading": {
      const l = (node.attrs?.level as number) ?? 1;
      return `<h${l}>${inlineToHtml(node.content ?? [])}</h${l}>`;
    }
    case "blockquote":
      return `<blockquote>${(node.content ?? []).map(blockToHtml).join("")}</blockquote>`;
    case "code_block":
      return `<pre><code>${escapeHtml((node.content ?? []).map((c) => c.text ?? "").join(""))}</code></pre>`;
    case "divider":
      return "<hr>";
    case "image":
      // alt is always present (empty string if none) — required for the a11y gate.
      return `<img src="${escapeAttr((node.attrs?.src as string) ?? "")}" alt="${escapeAttr((node.attrs?.alt as string) ?? "")}">`;
    case "bullet_list":
      return `<ul>${(node.content ?? []).map(listItemToHtml).join("")}</ul>`;
    case "ordered_list":
      return `<ol>${(node.content ?? []).map(listItemToHtml).join("")}</ol>`;
    case "todo_list":
      return `<ul class="todo">${(node.content ?? []).map(listItemToHtml).join("")}</ul>`;
    default:
      return inlineToHtml(node.content ?? []);
  }
}

function listItemToHtml(li: PMNodeJSON): string {
  return `<li>${(li.content ?? []).map(blockToHtml).join("")}</li>`;
}

function inlineToHtml(nodes: PMNodeJSON[]): string {
  return nodes
    .map((n) => {
      let t = escapeHtml(n.text ?? "");
      for (const m of n.marks ?? []) {
        if (m.type === "strong") t = `<strong>${t}</strong>`;
        else if (m.type === "em") t = `<em>${t}</em>`;
        else if (m.type === "code") t = `<code>${t}</code>`;
        else if (m.type === "link") t = `<a href="${escapeAttr((m.attrs?.href as string) ?? "")}">${t}</a>`;
      }
      return t;
    })
    .join("");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
