import { describe, it, expect } from "vitest";
import * as Y from "yjs";
import { safeApplyUpdate, verifyUpdateAuthorship, updateClientIds } from "./security";
import { encodeState } from "./ydoc";

describe("malformed-update rejection (S13)", () => {
  it("applies a valid update", () => {
    const src = new Y.Doc();
    src.getText("t").insert(0, "hi");
    const dst = new Y.Doc();
    expect(safeApplyUpdate(dst, encodeState(src))).toEqual({ ok: true });
    expect(dst.getText("t").toString()).toBe("hi");
  });

  it("rejects an empty update", () => {
    expect(safeApplyUpdate(new Y.Doc(), new Uint8Array())).toEqual({ ok: false, reason: "empty" });
  });

  it("rejects an oversize update before parsing (DoS guard)", () => {
    const huge = new Uint8Array(2 * 1024 * 1024);
    expect(safeApplyUpdate(new Y.Doc(), huge, 512 * 1024)).toEqual({ ok: false, reason: "too-large" });
  });

  it("quarantines garbage bytes without corrupting the live doc", () => {
    const doc = new Y.Doc();
    doc.getText("t").insert(0, "safe");
    const garbage = new Uint8Array([9, 9, 9, 255, 1, 2, 3, 200, 200, 200]);
    const res = safeApplyUpdate(doc, garbage);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("malformed");
    expect(doc.getText("t").toString()).toBe("safe"); // untouched — validated on a scratch doc first
  });
});

describe("authorship verification (S13) — no edit-as-your-boss", () => {
  it("accepts an update authored by the caller's own client id", () => {
    const doc = new Y.Doc();
    const myClientId = doc.clientID;
    let update: Uint8Array | null = null;
    doc.on("update", (u: Uint8Array) => (update = u));
    doc.getText("t").insert(0, "mine");
    expect(verifyUpdateAuthorship(update!, myClientId)).toBe(true);
  });

  it("rejects an update whose authorship is a DIFFERENT client id (spoofed)", () => {
    const attacker = new Y.Doc(); // a different client id
    let update: Uint8Array | null = null;
    attacker.on("update", (u: Uint8Array) => (update = u));
    attacker.getText("t").insert(0, "as the boss");
    const victimSessionClientId = attacker.clientID + 1; // the server's authenticated id for THIS socket
    expect(verifyUpdateAuthorship(update!, victimSessionClientId)).toBe(false);
  });

  it("rejects malformed updates (no verifiable authorship)", () => {
    expect(verifyUpdateAuthorship(new Uint8Array([1, 2, 3]), 42)).toBe(false);
    expect(updateClientIds(new Uint8Array([1, 2, 3])).size).toBe(0);
  });
});
