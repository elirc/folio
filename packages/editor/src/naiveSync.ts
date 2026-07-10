import { Node as PMNode, type Schema } from "prosemirror-model";

/**
 * Naive real-time sync (S05) — deliberately, loudly BROKEN. This is the most important failure in the whole
 * course: you must *feel* why CRDTs exist before you build one (S06) or adopt one (S07).
 *
 * The model: on every change, a client serializes its ENTIRE document and broadcasts it. A receiving client
 * REPLACES its whole document with the incoming one. "Merge" is a lie — there is no merge, only overwrite.
 *
 * 📘 LAST-WRITE-WINS HAS NO CONCEPT OF *CONCURRENT* CHANGES. It only knows "latest." Two people editing
 * different paragraphs at the same time don't merge — whoever's update lands second overwrites the first,
 * and the first person's work vanishes with no error, no conflict, nothing. This is not a bug to fix in
 * this file; it is the *motivation* for the next two sprints. `naiveSync.test.ts` proves the data loss on
 * purpose — that test is the regression S07 will flip to green.
 */

/** A whole-document update as it travels over the wire: the entire doc + a monotonic revision. */
export interface NaiveUpdate {
  rev: number;
  doc: unknown; // ProseMirror JSON — the ENTIRE document, every time
}

/**
 * Apply an incoming update to the local document — the naive way. The incoming whole-doc simply WINS. The
 * local document (and any concurrent edit it contains) is discarded. `_localRev` is accepted only to show
 * that we *have* the information to detect a conflict here — and naively throw it away.
 */
export function applyNaiveUpdate(_local: PMNode, incoming: NaiveUpdate, schema: Schema): PMNode {
  // Last-write-wins: replace everything. No three-way merge, no operational transform, no CRDT.
  return PMNode.fromJSON(schema, incoming.doc);
}

/**
 * Decide which of two updates "wins" under LWW: the higher revision (ties broken by arrival, i.e. `b`).
 * This is the entire conflict-resolution strategy — and its poverty is the point.
 */
export function lastWriteWins(a: NaiveUpdate, b: NaiveUpdate): NaiveUpdate {
  return b.rev >= a.rev ? b : a;
}
