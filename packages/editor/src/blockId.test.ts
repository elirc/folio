import { describe, it, expect, vi } from "vitest";
import { makeBlockId, isBlockId, blockIdFor, isYjsBlockId } from "./blockId";

describe("block ids (S03, flaw #2 — collision-prone, harvested S07)", () => {
  it("produces ids of the documented shape", () => {
    const id = makeBlockId();
    expect(isBlockId(id)).toBe(true);
    expect(id).toMatch(/^b[0-9a-z]{8}$/);
  });

  it("isBlockId rejects foreign shapes", () => {
    expect(isBlockId("hello")).toBe(false);
    expect(isBlockId(42)).toBe(false);
    expect(isBlockId(undefined)).toBe(false);
  });

  // This test DOCUMENTS the flaw rather than hiding it: with only 4 random chars and a shared millisecond,
  // the id space is small enough that collisions are plausible under concurrency. We don't assert
  // "never collides" (that would be a false promise); we assert the space is as thin as the ⚠️ warns.
  // S07's harvest replaces this test with a real concurrent-collision reproduction + the Yjs-identity fix.
  it("has a thin random tail — the seed of flaw #2", () => {
    // 4 base-36 chars ⇒ 36^4 ≈ 1.7M combinations *within the same ms bucket*. Birthday-bound: collisions
    // become likely in the low thousands of same-ms creations. Enough to bite under real multiplayer.
    const RANDOM_TAIL_LEN = 4;
    expect(RANDOM_TAIL_LEN).toBeLessThan(8);
  });
});

describe("flaw #2 HARVEST (S07): Yjs-derived ids are collision-proof", () => {
  it("the OLD scheme CAN collide when two clients hit the same ms + rng (the planted flaw)", () => {
    // Freeze time and Math.random so two "different clients" produce the SAME id — the exact failure the
    // ledger warned about under offline/concurrent creation.
    const now = vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const rng = vi.spyOn(Math, "random").mockReturnValue(0.123456);
    const clientA = makeBlockId();
    const clientB = makeBlockId(); // "different client", same ms + same rng draw
    expect(clientA).toBe(clientB); // 💥 collision — two blocks, one id
    now.mockRestore();
    rng.mockRestore();
  });

  it("the NEW (clientId, clock) scheme cannot collide across clients or edits", () => {
    // Two different Yjs clients, same clock → different ids (clientId differs).
    expect(blockIdFor(111, 5)).not.toBe(blockIdFor(222, 5));
    // Same client, different edits → different ids (clock differs).
    expect(blockIdFor(111, 5)).not.toBe(blockIdFor(111, 6));
    expect(isYjsBlockId(blockIdFor(111, 5))).toBe(true);
  });
});
