import * as Y from "yjs";
import { prosemirrorJSONToYDoc, yDocToProsemirrorJSON } from "y-prosemirror";
import { folioSchema } from "@folio/editor";

/**
 * The Yjs document core (S07). This is crdt-101 GROWN UP: a Y.Doc is a production CRDT, and its updates are
 * the same *operations* you built by hand in S06 — identity, causal ordering, tombstones — just industrial,
 * fast, and rich-text-capable. We read Yjs as peers who built the toy (ADR-0007).
 *
 * Convention: a Folio document is a Y.XmlFragment named "prosemirror" (the y-prosemirror standard), so the
 * editor binding is a drop-in. All the functions here are DOM-agnostic (Yjs is isomorphic), which is why the
 * convergence tests and the flipped S05 test run in Node with no browser.
 */
export const FRAGMENT = "prosemirror";

/** A fresh, empty collaborative document. */
export function newDoc(): Y.Doc {
  return new Y.Doc();
}

/**
 * Migrate a ProseMirror-JSON document (the S03–S06 storage format) into a Y.Doc. This is the expand step of
 * the migration: load the old JSON, seed a CRDT, and from now on the CRDT is the source of truth.
 */
export function docFromProseMirrorJSON(json: unknown): Y.Doc {
  // y-prosemirror builds the Y.Doc's "prosemirror" fragment from the PM JSON using our schema.
  return prosemirrorJSONToYDoc(folioSchema, json ?? emptyPMJSON(), FRAGMENT);
}

/** Read a Y.Doc back as ProseMirror JSON (for snapshots, export, or debugging). */
export function proseMirrorJSONFromDoc(doc: Y.Doc): unknown {
  return yDocToProsemirrorJSON(doc, FRAGMENT);
}

// ── update primitives (the wire currency) ──────────────────────────────────────────────────────────
/** The full state of a doc as a single update (a snapshot you can apply to an empty doc). */
export function encodeState(doc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(doc);
}

/** A compact fingerprint of what a doc already has — the basis for sending only the missing delta. */
export function stateVector(doc: Y.Doc): Uint8Array {
  return Y.encodeStateVector(doc);
}

/** The delta a peer is missing, given their state vector. This is what makes sync efficient. */
export function diffUpdate(doc: Y.Doc, theirStateVector: Uint8Array): Uint8Array {
  return Y.encodeStateAsUpdate(doc, theirStateVector);
}

/** Merge an incoming update into a doc. Commutative, idempotent, convergent — Yjs guarantees it. */
export function applyUpdate(doc: Y.Doc, update: Uint8Array, origin?: unknown): void {
  Y.applyUpdate(doc, update, origin);
}

function emptyPMJSON() {
  return { type: "doc", content: [{ type: "paragraph" }] };
}
