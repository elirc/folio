import { describe, it, expect } from "vitest";
import { folioSchema } from "./schema";
import { applyNaiveUpdate, lastWriteWins, type NaiveUpdate } from "./naiveSync";

/**
 * THE DAMNING TEST (S05, flaw #1 — announced). This test does NOT assert correctness. It asserts a KNOWN
 * FAILURE: under naive last-write-wins, two people editing concurrently lose one person's work. It turns
 * "trust me, it's broken" into a reproducible fact, and it is the exact regression S07 must flip to green
 * (naive → Yjs). Read it and watch a paragraph die.
 */

/** A doc with the given paragraphs (each a top-level block). */
function docOf(paras: string[]) {
  const s = folioSchema;
  return s.node(
    "doc",
    null,
    paras.map((t) => s.node("paragraph", { blockId: "b0000000" }, t ? s.text(t) : undefined)),
  );
}

function texts(doc: ReturnType<typeof docOf>): string[] {
  const out: string[] = [];
  doc.forEach((n) => out.push(n.textContent));
  return out;
}

describe("naive LWW sync (S05) — documents the data loss on purpose", () => {
  it("TWO-CLIENT CONCURRENT EDIT: the slower writer's paragraph VANISHES", () => {
    // Both clients start from the same base document.
    const base = docOf(["Shared intro"]);

    // Alice adds her paragraph (her local document; she'll broadcast it too, but the loss shows on receive).
    const aliceDoc = docOf(["Shared intro", "Alice's paragraph"]);

    // Bob, concurrently (from the SAME base, not seeing Alice's), adds his paragraph and broadcasts his.
    const bobDoc = docOf(["Shared intro", "Bob's paragraph"]);
    const bobUpdate: NaiveUpdate = { rev: 1, doc: bobDoc.toJSON() };

    // On Alice's screen, Bob's whole-doc update arrives and REPLACES everything (LWW).
    const onAlice = applyNaiveUpdate(aliceDoc, bobUpdate, folioSchema);

    // Alice's paragraph is GONE. No error was raised. This is the flaw, reproduced.
    expect(texts(onAlice)).toContain("Bob's paragraph");
    expect(texts(onAlice)).not.toContain("Alice's paragraph"); // ← her work was silently eaten
    // The two concurrent edits did NOT merge — the doc lost one of them entirely.
    expect(texts(onAlice)).toEqual(["Shared intro", "Bob's paragraph"]);
    void base;
  });

  it("lastWriteWins keeps the later revision — the entire (impoverished) conflict strategy", () => {
    const older: NaiveUpdate = { rev: 3, doc: docOf(["v3"]).toJSON() };
    const newer: NaiveUpdate = { rev: 4, doc: docOf(["v4"]).toJSON() };
    expect(lastWriteWins(older, newer)).toBe(newer);
    expect(lastWriteWins(newer, older)).toBe(newer); // order-independent: rev decides
  });

  it("even identical concurrent intent collapses to one copy (no merge exists)", () => {
    // Both type the same new paragraph independently. A merge would keep one; LWW also keeps one — but for
    // the WRONG reason (overwrite, not dedupe). The point: there is no merge machinery at all.
    const a = docOf(["x", "note"]);
    const b = docOf(["x", "note"]);
    const merged = applyNaiveUpdate(a, { rev: 1, doc: b.toJSON() }, folioSchema);
    expect(texts(merged)).toEqual(["x", "note"]);
  });
});
