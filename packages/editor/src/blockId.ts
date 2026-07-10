/**
 * Block ids (S03). Every block gets a stable id so that — later — comments can anchor to a block, presence
 * can point at one, and sync can address one. For a single user, generating them on the client is the
 * obvious, simple choice.
 *
 * The scheme: a short timestamp fragment + a few random base-36 chars. Cheap, no round-trip, readable.
 *
 * ⚠️ This is fine for one user typing in one tab. It is NOT obviously fine once two people (or one person
 * on two devices, one offline) create blocks in the *same millisecond* — the random tail is short and the
 * timestamp collides, so two blocks can end up with the SAME id. A reviewer should feel a flicker of doubt
 * here (see the review thread on this line). We ship it as-is on purpose; the fix lands when it actually
 * bites, under real concurrency, in S07 (Yjs assigns identity), with a collision test that quotes this.
 */
export function makeBlockId(): string {
  const t = Date.now().toString(36).slice(-4);
  const r = Math.random().toString(36).slice(2, 6); // only 4 random chars — deliberately thin
  return `b${t}${r}`;
}

/** Structural check only (does it look like one of ours?) — NOT a uniqueness guarantee. */
export function isBlockId(value: unknown): value is string {
  return typeof value === "string" && /^b[0-9a-z]{8}$/.test(value);
}

/**
 * S07 — HARVEST OF FLAW #2 (ledger: "block ids generated client-side with Math.random-ish scheme —
 * collision-prone under offline/concurrent creation"). Once we adopt Yjs, identity is no longer ours to
 * gamble on: every client gets a unique `clientId` (a 53-bit random assigned per Y.Doc) and a monotonically
 * increasing `clock`. The pair (clientId, clock) is GLOBALLY UNIQUE by construction — no timestamp bucket,
 * no thin random tail, no birthday-bound collision. This is *identity, not chance* (S06's keystone): the
 * same substitution that makes the CRDT converge also makes block ids collision-proof for free.
 */
export function blockIdFor(clientId: number, clock: number): string {
  return `b${clientId.toString(36)}-${clock.toString(36)}`;
}

/** Does this id look like a Yjs-derived (collision-proof) id? */
export function isYjsBlockId(value: unknown): value is string {
  return typeof value === "string" && /^b[0-9a-z]+-[0-9a-z]+$/.test(value);
}
