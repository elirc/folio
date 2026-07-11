import * as Y from "yjs";
import { FRAGMENT } from "./ydoc";

/**
 * Plain-text projection of a document (S14). The search index is a DERIVED VIEW of the CRDT: on change, we
 * extract the document's plain text and (re)index it in Postgres FTS.
 *
 * 📘 THE CRDT IS THE SOURCE; THE INDEX IS A PROJECTION. 🔗 the read-path/write-path split from earlier
 * courses: the write path (the Y.Doc) stays hot and authoritative; the read path (search) is a separate,
 * eventually-consistent view built by extracting text on change. A just-typed word becomes searchable a beat
 * later — that lag is bounded and user-invisible, and it's the right trade (don't couple search to the
 * editor's hot path).
 */
export function extractPlainText(doc: Y.Doc): string {
  const frag = doc.getXmlFragment(FRAGMENT);
  const parts: string[] = [];
  walk(frag, parts);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function walk(node: Y.XmlFragment | Y.XmlElement | Y.XmlText, out: string[]): void {
  if (node instanceof Y.XmlText) {
    out.push(node.toString());
    return;
  }
  // XmlFragment / XmlElement: iterate children.
  const len = node.length;
  for (let i = 0; i < len; i++) {
    const child = node.get(i);
    if (child instanceof Y.XmlText || child instanceof Y.XmlElement) walk(child, out);
  }
}
