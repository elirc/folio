import { type Role } from "./acl";

/**
 * Share links (S11) — scoped capability tokens layered on top of role-based inheritance. A link grants a
 * specific role to anyone holding the token, until it expires or is revoked.
 *
 * 🔗 Pulse S10's share-token lesson learned: expiry + revocation are NOT optional. A share link without an
 * expiry is a permanent, un-auditable backdoor; without revocation you can't undo an over-share. The learner
 * builds both in from the start — the git history shows a lesson that stuck (no re-planted flaw here).
 */
export interface ShareLink {
  token: string;
  nodeId: string;
  role: Role;
  /** epoch ms; null = never expires (discouraged — the UI nudges toward an expiry). */
  expiresAt: number | null;
  revoked: boolean;
}

export type ShareLinkDenial = "revoked" | "expired" | "not-found";

/** Resolve the role a share link grants right now, or a typed denial reason. */
export function resolveShareLink(link: ShareLink | null, now: number): Role | ShareLinkDenial {
  if (!link) return "not-found";
  if (link.revoked) return "revoked";
  if (link.expiresAt !== null && now >= link.expiresAt) return "expired";
  return link.role;
}

export function isShareDenial(value: Role | ShareLinkDenial): value is ShareLinkDenial {
  return value === "revoked" || value === "expired" || value === "not-found";
}
