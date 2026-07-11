import { describe, it, expect } from "vitest";
import * as Y from "yjs";
import { backupDoc, restoreDoc, resyncAfterRestore, checksum } from "./backup";
import { encodeState } from "./ydoc";

describe("backup & restore (S15)", () => {
  it("backs up and restores a document exactly", () => {
    const doc = new Y.Doc();
    doc.getText("t").insert(0, "important content");
    const backup = backupDoc(doc);
    const restored = restoreDoc(backup);
    expect(restored.getText("t").toString()).toBe("important content");
  });

  it("refuses to restore corrupt data (loud failure, not silent)", () => {
    const doc = new Y.Doc();
    doc.getText("t").insert(0, "x");
    const backup = backupDoc(doc);
    const corrupt = { ...backup, checksum: backup.checksum + 1 };
    expect(() => restoreDoc(corrupt)).toThrow(/checksum mismatch/);
  });

  it("checksum detects a single-byte flip", () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const flipped = new Uint8Array([1, 2, 99, 4]);
    expect(checksum(bytes)).not.toBe(checksum(flipped));
  });

  it("a client AHEAD of the backup re-syncs FORWARD — its newer edits survive (no rewind)", () => {
    // Server doc backed up at "v1".
    const server = new Y.Doc();
    server.getText("t").insert(0, "v1");
    const backup = backupDoc(server);

    // A client kept editing after the backup — it's now ahead ("v1 + more").
    const client = new Y.Doc();
    Y.applyUpdate(client, encodeState(server));
    client.getText("t").insert(2, " + client edits");

    // Restore the server from the OLD backup, then re-sync the ahead client.
    const restored = restoreDoc(backup);
    resyncAfterRestore(client, backup); // merge forward, don't rewind

    // The client's newer edits survive; nothing was lost by restoring an older backup.
    expect(client.getText("t").toString()).toContain("client edits");
    // And re-merging the client's state into the restored server converges them.
    Y.applyUpdate(restored, encodeState(client), "remote");
    expect(restored.getText("t").toString()).toBe(client.getText("t").toString());
  });
});
