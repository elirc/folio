import { describe, it, expect } from "vitest";
import * as Y from "yjs";
import { encodeState, applyUpdate } from "./ydoc";

/**
 * The duplicate-block lesson (S08, in-PR arc) — the most subtle teaching moment of the sprint.
 *
 * ⚠️ A PROPER CRDT MAKES MERGE CONFLICTS IMPOSSIBLE *WITHIN THE MODEL*. So when you see a "duplicate" after
 * an offline merge, the bug is almost never in the merge — it's in logic that lives OUTSIDE the CRDT.
 *
 * The [J] version generated block identity APP-SIDE (a deterministic id from, say, the block's position or a
 * hash), then tried to DEDUPE on reconnect ("if two blocks share this id, drop one"). Two offline clients
 * created "the same" block, got the same app-side id, and the dedupe logic either dropped a real edit or
 * created a phantom duplicate. The [S] fix: let Yjs own identity (S07's move). Then two offline block
 * creations are simply two DISTINCT blocks — both survive, order-deterministically, and there is nothing to
 * dedupe because the model never conflated them. 🔗 This is *why* S07 moved ids into the CRDT.
 */

/** Build a doc whose "prosemirror" fragment holds paragraph elements with the given texts. */
function docWithParagraphs(texts: string[]): Y.Doc {
  const doc = new Y.Doc();
  const frag = doc.getXmlFragment("prosemirror");
  for (const t of texts) {
    const p = new Y.XmlElement("paragraph");
    p.insert(0, [new Y.XmlText(t)]);
    frag.push([p]);
  }
  return doc;
}

function paragraphTexts(doc: Y.Doc): string[] {
  const frag = doc.getXmlFragment("prosemirror");
  const out: string[] = [];
  frag.forEach((el) => {
    if (el instanceof Y.XmlElement) out.push(el.toString().replace(/<[^>]+>/g, ""));
  });
  return out;
}

describe("offline block creation (S08)", () => {
  it("two offline clients each create a block → after merge BOTH survive, none lost, and they converge", () => {
    // Shared starting point.
    const base = docWithParagraphs(["intro"]);
    const baseUpdate = encodeState(base);

    const a = new Y.Doc();
    applyUpdate(a, baseUpdate);
    const b = new Y.Doc();
    applyUpdate(b, baseUpdate);

    // OFFLINE: A adds a block, B adds a different block — concurrently, neither seeing the other.
    const aFrag = a.getXmlFragment("prosemirror");
    const aP = new Y.XmlElement("paragraph");
    aP.insert(0, [new Y.XmlText("A's new block")]);
    aFrag.push([aP]);

    const bFrag = b.getXmlFragment("prosemirror");
    const bP = new Y.XmlElement("paragraph");
    bP.insert(0, [new Y.XmlText("B's new block")]);
    bFrag.push([bP]);

    // HEAL.
    applyUpdate(b, encodeState(a), "remote");
    applyUpdate(a, encodeState(b), "remote");

    // Both blocks survive as DISTINCT blocks; the two replicas are identical. No dedupe, no lost work.
    expect(paragraphTexts(a)).toEqual(paragraphTexts(b)); // converged
    expect(paragraphTexts(a)).toContain("A's new block");
    expect(paragraphTexts(a)).toContain("B's new block");
    expect(paragraphTexts(a)).toHaveLength(3); // intro + A + B — exactly right
  });

  it("the same block edited offline by both converges to ONE block (not two) — because identity is Yjs's", () => {
    // A shared block that both edit while offline. Because the block's identity lives in the CRDT, both
    // edits land on the SAME block; there is no accidental duplicate.
    const base = docWithParagraphs(["shared block"]);
    const a = new Y.Doc();
    applyUpdate(a, encodeState(base));
    const b = new Y.Doc();
    applyUpdate(b, encodeState(base));

    // Both append text to the (single, shared-identity) first paragraph, offline.
    (a.getXmlFragment("prosemirror").get(0) as Y.XmlElement).insert(1, [new Y.XmlText(" +A")]);
    (b.getXmlFragment("prosemirror").get(0) as Y.XmlElement).insert(1, [new Y.XmlText(" +B")]);

    applyUpdate(b, encodeState(a), "remote");
    applyUpdate(a, encodeState(b), "remote");

    expect(paragraphTexts(a)).toEqual(paragraphTexts(b));
    expect(paragraphTexts(a)).toHaveLength(1); // still ONE block — no duplicate
    expect(paragraphTexts(a)[0]).toContain("+A");
    expect(paragraphTexts(a)[0]).toContain("+B");
  });
});
