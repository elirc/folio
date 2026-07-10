import * as Y from "yjs";
import { diffUpdate, stateVector, applyUpdate } from "./ydoc";

/**
 * The custom Yjs sync protocol (S07). We build our OWN provider instead of using y-websocket — not to
 * reinvent, but because the transport we depend on should not be a black box (the thesis of the whole
 * curriculum). This module is the protocol CORE, DOM- and socket-agnostic, so it's fully unit-testable.
 *
 * 📘 IT IS crdt-101's "merge two replicas," GENERALIZED INTO A WIRE PROTOCOL. To sync, a peer says "here's
 * what I already have" (a state vector) and the other replies "here's exactly what you're missing" (the
 * delta). Then every subsequent local change is relayed as an incremental update. Sending only the delta —
 * not the whole document — is what makes it efficient, and it's the same idea as diffing two replicas by
 * hand, now automated by Yjs's structure.
 *
 * The handshake (Yjs sync v1):
 *   SyncStep1(sv)  — "I have this; send me what I lack."   (both peers send this on connect)
 *   SyncStep2(diff) — "here is the delta for your sv."
 *   Update(update)  — "here is a new incremental change."  (steady state)
 */

export type SyncMessage =
  | { type: "sync1"; sv: string } // base64 state vector
  | { type: "sync2"; update: string } // base64 delta
  | { type: "update"; update: string }; // base64 incremental update

/** Presence/cursor traffic (S07). Framed alongside sync but NEVER applied to the doc — the server relays it
 * to other clients and forgets it. Ephemeral by construction (see awareness.ts). */
export type AwarenessMessage = { type: "awareness"; payload: string };

/** Everything that crosses the wire: document sync + ephemeral awareness. */
export type WireMessage = SyncMessage | AwarenessMessage;

export function isSyncMessage(m: WireMessage): m is SyncMessage {
  return m.type === "sync1" || m.type === "sync2" || m.type === "update";
}

// ── base64 <-> bytes (JSON-safe framing; a real provider would use binary frames) ──────────────────
export function toB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
export function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** The first message a peer sends on connect: its state vector. */
export function writeSyncStep1(doc: Y.Doc): SyncMessage {
  return { type: "sync1", sv: toB64(stateVector(doc)) };
}

/** Answer a peer's step1 with exactly the delta they're missing. */
export function writeSyncStep2(doc: Y.Doc, theirSv: Uint8Array): SyncMessage {
  return { type: "sync2", update: toB64(diffUpdate(doc, theirSv)) };
}

/** Frame a local incremental update for relay. */
export function writeUpdate(update: Uint8Array): SyncMessage {
  return { type: "update", update: toB64(update) };
}

/**
 * Consume one message. Returns a reply to send back (or null). Applying updates into `doc` is what actually
 * converges the two replicas — and because Yjs merges are commutative/idempotent, the order of messages and
 * duplicates don't matter (the property crdt-101's fuzzer taught us to demand).
 */
export function readSyncMessage(doc: Y.Doc, msg: SyncMessage, origin?: unknown): SyncMessage | null {
  switch (msg.type) {
    case "sync1":
      return writeSyncStep2(doc, fromB64(msg.sv));
    case "sync2":
    case "update":
      applyUpdate(doc, fromB64(msg.update), origin);
      return null;
  }
}
