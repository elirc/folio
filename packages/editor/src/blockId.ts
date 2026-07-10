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
