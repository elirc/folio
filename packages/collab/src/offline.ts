import * as Y from "yjs";
import { diffUpdate, encodeState, stateVector, applyUpdate } from "./ydoc";

/**
 * Offline-first merge (S08). The CRDT's headline promise: edit offline, reconnect, converge — no clobber, no
 * merge dialog. While disconnected, local edits simply accumulate in the Y.Doc; reconnection is *just* a
 * sync handshake. This module makes the reconnect-payload choice explicit, because it hides a real lesson.
 */

/**
 * [L/J] The NAIVE reconnect: resend the ENTIRE local state. It works — the peer merges it and converges —
 * but it re-sends everything the peer already has, every reconnect. On a long document with brief offline
 * blips, that's wildly wasteful.
 */
export function naiveReconnectPayload(doc: Y.Doc): Uint8Array {
  return encodeState(doc);
}

/**
 * [S] The reviewed fix: send only the DIFF the peer is missing, computed from their state vector — the exact
 * SV exchange we already built in S07. 📘 The recurring capstone review note: *use the tool you adopted.*
 * Yjs already solved efficient reconnect; re-deriving a full-resend re-invents a problem that's already gone.
 */
export function diffReconnectPayload(doc: Y.Doc, peerStateVector: Uint8Array): Uint8Array {
  return diffUpdate(doc, peerStateVector);
}

/** Convenience: this doc's state vector, to hand a peer so they can compute our diff. */
export function myStateVector(doc: Y.Doc): Uint8Array {
  return stateVector(doc);
}

/**
 * Heal a partition: apply a batch of updates accumulated elsewhere while we were offline. Order- and
 * duplicate-independent (Yjs merges commute), so a replayed or reordered queue still converges.
 */
export function healWith(doc: Y.Doc, updates: Uint8Array[]): void {
  for (const u of updates) applyUpdate(doc, u, "remote");
}
