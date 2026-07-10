import * as Y from "yjs";

/**
 * Load-test harness (S12). The measuring stick: build a large document and simulate many cursors, so the
 * perf budget is checked against *realistic* scale (10k blocks, 50 cursors), not a toy. 🔗 The learner
 * builds load tools reflexively now — you can't defend a budget you never stress.
 */

/** A Y.Doc with `blockCount` paragraph blocks in its "prosemirror" fragment. */
export function bigDoc(blockCount: number): Y.Doc {
  const doc = new Y.Doc();
  const frag = doc.getXmlFragment("prosemirror");
  const blocks: Y.XmlElement[] = [];
  for (let i = 0; i < blockCount; i++) {
    const p = new Y.XmlElement("paragraph");
    p.insert(0, [new Y.XmlText(`Block ${i} — some representative body text for realistic sizing.`)]);
    blocks.push(p);
  }
  frag.insert(0, blocks); // one transaction — realistic bulk load
  return doc;
}

/** Simulated cursor positions for `n` users over a document of `size` characters. */
export function simulateCursors(n: number, size: number): { id: string; index: number }[] {
  return Array.from({ length: n }, (_, i) => ({ id: `u${i}`, index: Math.floor((i / n) * size) }));
}
