import { Node as PMNode } from "prosemirror-model";
import { folioSchema } from "./schema";
import { makeBlockId } from "./blockId";

/**
 * Document (de)serialization (S03). The stored form of a document is now **ProseMirror JSON** — a
 * structured block tree, not the plaintext string of S01/S02.
 *
 * 🔗 KEEP THE NAME, GROW THE MEANING (ADR-0002). This JSON still lands in `DocState.text` as one blob, and
 * saving still replaces the whole blob (see the naive whole-doc save in the API + web). That's fine for one
 * user and *catastrophic* for two — it's literally last-write-wins, the exact thing S05 demonstrates and
 * S07 replaces with a Yjs update log. The shape got richer; the naïveté of the persistence did not.
 */

/** A fresh document: a single empty paragraph with a block id. */
export function emptyDoc(): PMNode {
  return folioSchema.node("doc", null, [folioSchema.node("paragraph", { blockId: makeBlockId() })]);
}

/** Serialize a document to the JSON we persist. */
export function docToJSON(doc: PMNode): unknown {
  return doc.toJSON();
}

/**
 * Parse persisted JSON back into a document. Tolerant on purpose: anything unparseable or schema-invalid
 * (an older plaintext row from S01/S02, corruption, a partial write) degrades to an empty doc rather than
 * throwing in the user's face. We'd rather lose a broken doc's structure than refuse to open it.
 */
export function docFromJSON(json: unknown): PMNode {
  if (json == null) return emptyDoc();
  try {
    // S01/S02 stored plaintext. If we get a bare string, wrap it as one paragraph so old docs still open.
    if (typeof json === "string") return plaintextToDoc(json);
    const node = PMNode.fromJSON(folioSchema, json);
    node.check(); // throws if the JSON violates the schema
    return node;
  } catch {
    return emptyDoc();
  }
}

/** Migrate a pre-S03 plaintext document into the block model (paragraphs split on newlines). */
export function plaintextToDoc(text: string): PMNode {
  const lines = text.length ? text.split("\n") : [""];
  const paras = lines.map((line) =>
    folioSchema.node("paragraph", { blockId: makeBlockId() }, line ? folioSchema.text(line) : undefined),
  );
  return folioSchema.node("doc", null, paras);
}
