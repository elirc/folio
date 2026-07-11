import * as Y from "yjs";
import { encodeState } from "./ydoc";

/**
 * Backup & restore of the update log (S15). A backup is a compacted snapshot + a checksum; restore rebuilds
 * a doc and refuses corruption loudly.
 *
 * 🔗 RESTORING A COLLABORATIVE DOC IS SUBTLER THAN RESTORING A ROW (Tracer S15's seq-regression, CRDT-shaped).
 * Clients whose live state is *ahead* of the backup must NOT be rewound to it — that would destroy edits made
 * after the backup and diverge them from the server. Instead, restore is applied FORWARD: the backup merges
 * into the current doc (Yjs converges), and any client ahead of the backup re-syncs forward, keeping its
 * newer edits. Restore is append, never rewind — the S10 lesson, at the ops layer.
 */
export interface Backup {
  snapshot: Uint8Array;
  checksum: number;
}

/** A tiny non-cryptographic checksum (FNV-1a) — enough to catch corruption, not to resist tampering. */
export function checksum(bytes: Uint8Array): number {
  let h = 0x811c9dc5;
  for (const b of bytes) {
    h ^= b;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function backupDoc(doc: Y.Doc): Backup {
  const snapshot = encodeState(doc);
  return { snapshot, checksum: checksum(snapshot) };
}

/** Rebuild a doc from a backup, refusing corruption loudly. */
export function restoreDoc(backup: Backup): Y.Doc {
  if (checksum(backup.snapshot) !== backup.checksum) {
    throw new Error("backup checksum mismatch — refusing to restore corrupt data");
  }
  const doc = new Y.Doc();
  Y.applyUpdate(doc, backup.snapshot);
  return doc;
}

/**
 * Re-sync a live client whose state may be AHEAD of a restored backup. We merge the backup into the client's
 * doc (forward), so the client keeps any edits it made after the backup and converges with the restored
 * server — no rewind, no lost work.
 */
export function resyncAfterRestore(clientDoc: Y.Doc, backup: Backup): void {
  Y.applyUpdate(clientDoc, backup.snapshot, "restore"); // merge forward; the client's newer edits survive
}
