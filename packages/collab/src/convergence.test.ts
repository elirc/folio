import { describe, it, expect } from "vitest";
import fc from "fast-check";
import * as Y from "yjs";
import { encodeState, applyUpdate } from "./ydoc";
import { readSyncMessage, writeSyncStep1, writeUpdate, toB64 } from "./protocol";

/**
 * Convergence against the REAL transport (S07). We adapt crdt-101's fuzzer — the sacred artifact — and
 * re-aim it at Yjs + our custom sync protocol. We trust Yjs's core; we PROVE our integration converges.
 */

// ── THE FLAGSHIP MOMENT: the S05 damning test, flipped GREEN ────────────────────────────────────────
describe("S05 damning test → NOW GREEN (S07)", () => {
  it("TWO-CLIENT CONCURRENT EDIT: both paragraphs SURVIVE and the docs converge", () => {
    // Same shape as naiveSync.test.ts, but on a CRDT. Both clients start from the same base.
    const base = new Y.Doc();
    base.getArray<string>("paras").insert(0, ["Shared intro"]);
    const baseUpdate = encodeState(base);

    const alice = new Y.Doc();
    applyUpdate(alice, baseUpdate);
    const bob = new Y.Doc();
    applyUpdate(bob, baseUpdate);

    // Concurrently, from the SAME base (neither has seen the other):
    alice.getArray<string>("paras").push(["Alice's paragraph"]);
    bob.getArray<string>("paras").push(["Bob's paragraph"]);

    // Exchange updates (both directions).
    applyUpdate(bob, encodeState(alice));
    applyUpdate(alice, encodeState(bob));

    // In S05, one of these vanished. Here BOTH survive, and the two replicas are identical.
    const aParas = alice.getArray<string>("paras").toArray();
    const bParas = bob.getArray<string>("paras").toArray();
    expect(aParas).toEqual(bParas); // converged
    expect(aParas).toContain("Alice's paragraph"); // ← survived (S05: was eaten)
    expect(aParas).toContain("Bob's paragraph"); // ← survived
    expect(aParas).toContain("Shared intro");
  });
});

// ── the fuzzer, re-aimed at the Yjs transport + our protocol ────────────────────────────────────────
interface Edit {
  site: number;
  index: number;
  text: string;
}

/** Run concurrent edits across N replicas, relay updates through our protocol in a shuffled order. */
function runTransportScenario(siteCount: number, edits: Edit[], deliveryShuffle: number[]): string[] {
  const docs = Array.from({ length: siteCount }, () => new Y.Doc());
  const texts = docs.map((d) => d.getText("t"));
  const outbox: { origin: number; update: string }[] = [];

  // Capture each doc's outgoing updates as they happen.
  docs.forEach((d, i) => {
    d.on("update", (update: Uint8Array, origin: unknown) => {
      if (origin !== "remote") outbox.push({ origin: i, update: toB64(update) });
    });
  });

  // Phase 1: apply local edits (each produces an incremental update via the observer above).
  for (const e of edits) {
    const t = texts[e.site % siteCount]!;
    const at = t.length === 0 ? 0 : e.index % (t.length + 1);
    t.insert(at, e.text);
  }

  // Phase 2: deliver every captured update to every OTHER replica, in a shuffled order.
  const deliver = (entry: { origin: number; update: string }) => {
    for (let r = 0; r < siteCount; r++) {
      if (r !== entry.origin) readSyncMessage(docs[r]!, writeUpdate(fromB64Local(entry.update)), "remote");
    }
  };
  for (const idx of deliveryShuffle) {
    const entry = outbox[idx % outbox.length];
    if (entry) deliver(entry);
  }
  // Guarantee full propagation regardless of the shuffle.
  for (const entry of outbox) deliver(entry);

  return texts.map((t) => t.toString());
}

function fromB64Local(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

describe("crdt convergence over the Yjs transport (S07) — SACRED", () => {
  it("hand-built: two concurrent inserts converge and keep both", () => {
    const a = new Y.Doc();
    const b = new Y.Doc();
    a.getText("t").insert(0, "A");
    b.getText("t").insert(0, "B");
    applyUpdate(a, encodeState(b));
    applyUpdate(b, encodeState(a));
    expect(a.getText("t").toString()).toBe(b.getText("t").toString());
    expect(a.getText("t").length).toBe(2);
  });

  it("property: any interleaving of any edits → all replicas converge", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 4 }),
        fc.array(
          fc.record({ site: fc.nat(3), index: fc.nat(30), text: fc.constantFrom("a", "bb", "c", "xy", "z") }),
          { minLength: 1, maxLength: 30 },
        ),
        fc.array(fc.nat(300), { minLength: 0, maxLength: 60 }),
        (siteCount, rawEdits, shuffle) => {
          const edits = rawEdits.map((e) => ({ ...e, site: e.site % siteCount }));
          const finals = runTransportScenario(siteCount, edits, shuffle);
          for (const s of finals) expect(s).toBe(finals[0]);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("the sync handshake brings a fresh peer fully up to date (SV → delta)", () => {
    const server = new Y.Doc();
    server.getText("t").insert(0, "hello world");

    const client = new Y.Doc();
    // client connects and announces what it has (nothing) …
    const step1 = writeSyncStep1(client);
    // … server replies with exactly the delta …
    const step2 = readSyncMessage(server, step1)!;
    // … client applies it and is now in sync.
    readSyncMessage(client, step2, "remote");
    expect(client.getText("t").toString()).toBe("hello world");
  });
});
