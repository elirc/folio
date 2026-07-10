import { describe, it, expect } from "vitest";
import { resolveShareLink, isShareDenial, type ShareLink } from "./share";

const link = (over: Partial<ShareLink>): ShareLink => ({
  token: "t",
  nodeId: "n",
  role: "viewer",
  expiresAt: null,
  revoked: false,
  ...over,
});

describe("share links (S11) — expiry + revocation are not optional", () => {
  it("grants its role while valid", () => {
    expect(resolveShareLink(link({ role: "commenter" }), 1000)).toBe("commenter");
  });

  it("a revoked link denies (you can undo an over-share)", () => {
    expect(resolveShareLink(link({ revoked: true }), 1000)).toBe("revoked");
  });

  it("an expired link denies (no permanent backdoor)", () => {
    expect(resolveShareLink(link({ expiresAt: 500 }), 1000)).toBe("expired");
    expect(resolveShareLink(link({ expiresAt: 2000 }), 1000)).toBe("viewer"); // still valid
  });

  it("a missing link denies", () => {
    expect(resolveShareLink(null, 1000)).toBe("not-found");
  });

  it("isShareDenial distinguishes a role from a denial", () => {
    expect(isShareDenial(resolveShareLink(link({ revoked: true }), 1))).toBe(true);
    expect(isShareDenial(resolveShareLink(link({}), 1))).toBe(false);
  });
});
