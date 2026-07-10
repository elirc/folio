import { describe, it, expect } from "vitest";
import fc from "fast-check";
import * as Y from "yjs";
import { encodeState, applyUpdate } from "./ydoc";
import { naiveReconnectPayload, diffReconnectPayload, myStateVector, healWith } from "./offline";

/**
 * Offline-merge convergence (S08). The S06 fuzzer, extended to model PARTITIONS: replicas go offline, edit
 * independently, then heal — and must converge with NO lost work. This is the S05 nightmare made impossible.
 */

describe("offline-merge convergence (S08) — SACRED", () => {
  it("two clients edit fully offline, reconnect once, and converge keeping BOTH sets of edits", () => {
    const a = new Y.Doc();
    const b = new Y.Doc();
    // Both offline from empty. Each types a lot.
    a.getText("t").insert(0, "aaaaa");
    b.getText("t").insert(0, "bbbbb");
    // Heal: exchange full state once.
    applyUpdate(b, encodeState(a), "remote");
    applyUpdate(a, encodeState(b), "remote");
    expect(a.getText("t").toString()).toBe(b.getText("t").toString());
    expect(a.getText("t").length).toBe(10); // no lost work
  });

  it("property: partition N clients into groups, edit offline, heal in any order → converge", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 4 }),
        fc.array(fc.record({ site: fc.nat(3), index: fc.nat(30), text: fc.constantFrom("x", "yy", "z") }), { minLength: 1, maxLength: 24 }),
        fc.array(fc.nat(50), { minLength: 0, maxLength: 30 }),
        (n, rawEdits, healOrder) => {
          const docs = Array.from({ length: n }, () => new Y.Doc());
          // Everyone edits OFFLINE (no propagation during this phase).
          for (const e of rawEdits) {
            const t = docs[e.site % n]!.getText("t");
            t.insert(t.length === 0 ? 0 : e.index % (t.length + 1), e.text);
          }
          // Heal: exchange full state between every pair, in a shuffled order.
          const pairs: [number, number][] = [];
          for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) pairs.push([i, j]);
          const order = healOrder.length ? healOrder : [0];
          for (const k of order) {
            const [i, j] = pairs[k % pairs.length]!;
            applyUpdate(docs[j]!, encodeState(docs[i]!), "remote");
          }
          // Guarantee full heal regardless of shuffle.
          for (const [i, j] of pairs) applyUpdate(docs[j]!, encodeState(docs[i]!), "remote");
          const finals = docs.map((d) => d.getText("t").toString());
          for (const s of finals) expect(s).toBe(finals[0]);
        },
      ),
      { numRuns: 150 },
    );
  });
});

describe("reconnect payload: full resend vs SV diff (S08 review arc)", () => {
  it("the diff is strictly smaller than a full resend when the peer already has most of the doc", () => {
    const server = new Y.Doc();
    server.getText("t").insert(0, "a fairly long shared document that both peers already have in common");

    // The client is nearly caught up: it already holds the server's state, plus its own state vector.
    const client = new Y.Doc();
    applyUpdate(client, encodeState(server), "remote");
    server.getText("t").insert(0, "PS: "); // server makes one small new edit

    const full = naiveReconnectPayload(server); // [J] resend everything
    const diff = diffReconnectPayload(server, myStateVector(client)); // [S] only the missing delta
    expect(diff.byteLength).toBeLessThan(full.byteLength); // the SV exchange pays for itself
    // …and the diff still brings the client fully up to date.
    healWith(client, [diff]);
    expect(client.getText("t").toString()).toBe(server.getText("t").toString());
  });
});
