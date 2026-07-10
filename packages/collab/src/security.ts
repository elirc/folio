import * as Y from "yjs";

/**
 * Sync-layer security (S13). Yjs updates are BINARY BLOBS FROM CLIENTS — i.e. untrusted input on the hottest
 * path in the system. Two defenses live here, both pure and testable.
 */

/** Reject anything larger than this before we even try to parse it (a cheap DoS guard). */
export const MAX_UPDATE_BYTES = 512 * 1024; // 512 KB — generous for a real edit, tiny vs a malicious blob

export type UpdateRejection = "too-large" | "malformed" | "empty";

/**
 * ⚠️ MALFORMED-UPDATE REJECTION. A corrupt or hostile update must not crash the document or the server. We
 * cap size, then STRUCTURALLY VALIDATE by decoding into a throwaway doc inside a try/catch — if Yjs can't
 * parse it, we quarantine it instead of applying it to the live doc. Untrusted-input discipline, CRDT-shaped:
 * validate before you mutate shared state.
 */
export function safeApplyUpdate(
  doc: Y.Doc,
  update: Uint8Array,
  maxBytes = MAX_UPDATE_BYTES,
): { ok: true } | { ok: false; reason: UpdateRejection } {
  if (update.byteLength === 0) return { ok: false, reason: "empty" };
  if (update.byteLength > maxBytes) return { ok: false, reason: "too-large" };
  // Validate structure on a scratch doc first — a garbage blob throws here, never touching `doc`.
  try {
    const scratch = new Y.Doc();
    Y.applyUpdate(scratch, update);
  } catch {
    return { ok: false, reason: "malformed" };
  }
  Y.applyUpdate(doc, update, "remote");
  return { ok: true };
}

/**
 * The set of client ids that authored structs in an update. A Yjs update carries client ids that the SENDER
 * chose — so we must verify them against the authenticated session, or a client could forge one.
 */
export function updateClientIds(update: Uint8Array): Set<number> {
  const clients = new Set<number>();
  try {
    const { structs } = Y.decodeUpdate(update);
    for (const s of structs) clients.add((s as { id: { client: number } }).id.client);
  } catch {
    /* malformed → no verifiable authorship; caller treats as unauthorized */
  }
  return clients;
}

/**
 * 📘 AUTHORSHIP VERIFICATION. An update claims a client id; verify every authored struct belongs to the
 * caller's authenticated client id. Prevents "edit as your boss" — spoofing another user's authorship by
 * setting their client id. Identity on the wire must be SERVER-VERIFIED, never trusted from the payload.
 */
export function verifyUpdateAuthorship(update: Uint8Array, authenticatedClientId: number): boolean {
  const clients = updateClientIds(update);
  if (clients.size === 0) return false; // malformed or empty → not verifiably authored
  for (const c of clients) if (c !== authenticatedClientId) return false;
  return true;
}
