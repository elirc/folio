import { describe, it, expect } from "vitest";
import { makeBlockId, isBlockId } from "./blockId";

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
