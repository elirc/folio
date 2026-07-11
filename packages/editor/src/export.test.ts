import { describe, it, expect } from "vitest";
import { pmToMarkdown, pmToHtml, EXPORT_LOSSINESS } from "./export";

const doc = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Hello " },
        { type: "text", text: "bold", marks: [{ type: "strong" }] },
        { type: "text", text: " and " },
        { type: "text", text: "link", marks: [{ type: "link", attrs: { href: "https://x.dev" } }] },
      ],
    },
    {
      type: "bullet_list",
      content: [
        { type: "list_item", content: [{ type: "paragraph", content: [{ type: "text", text: "one" }] }] },
        { type: "list_item", content: [{ type: "paragraph", content: [{ type: "text", text: "two" }] }] },
      ],
    },
    { type: "code_block", content: [{ type: "text", text: "const x = 1;" }] },
    { type: "image", attrs: { src: "/a.png", alt: "a cat" } },
  ],
};

describe("export → Markdown (S14)", () => {
  const md = pmToMarkdown(doc);
  it("preserves headings, marks, links", () => {
    expect(md).toContain("# Title");
    expect(md).toContain("Hello **bold** and [link](https://x.dev)");
  });
  it("preserves lists, code, images", () => {
    expect(md).toContain("- one");
    expect(md).toContain("```\nconst x = 1;\n```");
    expect(md).toContain("![a cat](/a.png)");
  });
});

describe("export → HTML (S14)", () => {
  const html = pmToHtml(doc);
  it("preserves structure with escaping", () => {
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain('<a href="https://x.dev">link</a>');
    expect(html).toContain("<ul><li><p>one</p></li>");
  });
  it("always emits alt on images (a11y)", () => {
    expect(html).toContain('<img src="/a.png" alt="a cat">');
  });
  it("escapes HTML-special text", () => {
    const h = pmToHtml({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "a < b & c" }] }] });
    expect(h).toBe("<p>a &lt; b &amp; c</p>");
  });
});

describe("export lossiness is documented, not hidden (S14)", () => {
  it("names what each format drops", () => {
    expect(EXPORT_LOSSINESS.markdown).toContain("comments");
    expect(EXPORT_LOSSINESS.html).toContain("editability");
  });
  it("drops suggestion marks from output (lossy, as documented)", () => {
    const withSuggestion = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "kept", marks: [{ type: "suggestion_insert", attrs: { author: "a" } }] }] }],
    };
    expect(pmToMarkdown(withSuggestion)).toContain("kept"); // text kept, mark dropped
  });
});
