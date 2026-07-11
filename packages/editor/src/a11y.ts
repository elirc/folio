/**
 * Accessibility (S14). Two pieces, both pure and Node-testable: a collaborative-edit ANNOUNCER for screen
 * readers, and an a11y RULE CHECKER that runs the accessibility gate without a browser.
 */

// ── Collaborative-edit announcements (the novel hard part) ────────────────────────────────────────
/**
 * 🔗 A screen-reader user needs to know when a collaborator edits NEAR them — but not a firehose of every
 * keystroke. The rule (Tracer S14's real-time-a11y lesson, editor-shaped): announce **politely**, only for
 * the **focused region**, and **rate-limited** to at most one message per window, coalescing a burst into a
 * single summary ("Ann made 3 edits nearby"). A firehose is worse than silence — it makes the editor
 * unusable with a screen reader.
 */
export interface RemoteEdit {
  author: string;
  /** Block id (or region key) the edit touched. */
  region: string;
}

export class EditAnnouncer {
  private pending: RemoteEdit[] = [];
  private lastAnnouncedAt = -Infinity;

  constructor(
    /** Only announce edits to the user's currently focused region. */
    private focusedRegion: () => string | null,
    /** Minimum ms between announcements (coalesce bursts). */
    private readonly windowMs = 2000,
  ) {}

  setFocus(region: string | null): void {
    this.focusedRegion = () => region;
  }

  /** Record a remote edit; it's only queued if it touches the focused region. */
  observe(edit: RemoteEdit): void {
    if (edit.region === this.focusedRegion()) this.pending.push(edit);
  }

  /**
   * Produce a polite announcement if the rate window has elapsed and edits are pending; else null. Coalesces
   * a burst into one summary. Returns the aria-live text to speak.
   */
  poll(now: number): string | null {
    if (this.pending.length === 0) return null;
    if (now - this.lastAnnouncedAt < this.windowMs) return null; // rate-limited — hold
    const authors = [...new Set(this.pending.map((e) => e.author))];
    const count = this.pending.length;
    this.pending = [];
    this.lastAnnouncedAt = now;
    const who = authors.length === 1 ? authors[0] : `${authors.length} people`;
    return count === 1 ? `${who} edited nearby` : `${who} made ${count} edits nearby`;
  }
}

// ── The a11y gate: rule checks on rendered HTML (no browser) ───────────────────────────────────────
export interface A11yViolation {
  rule: string;
  detail: string;
}

/**
 * 🔗 The failing-allowlist a11y gate, learner-run — but DOM-less: we check the EXPORTED HTML string against
 * a small set of high-value rules (axe-core-style) so the gate runs in Node CI, no Playwright/browser.
 * Rules: images need an `alt` attribute; links need a non-empty `href`; headings must not be empty; heading
 * levels shouldn't skip (h1→h3). Not exhaustive, but it catches the regressions that matter for an editor.
 */
export function checkA11y(html: string): A11yViolation[] {
  const v: A11yViolation[] = [];

  // <img> without an alt attribute (empty alt is allowed — it means decorative).
  for (const img of html.match(/<img\b[^>]*>/gi) ?? []) {
    if (!/\balt\s*=/.test(img)) v.push({ rule: "img-alt", detail: `image missing alt attribute: ${img.slice(0, 60)}` });
  }

  // <a> with a missing or empty href.
  for (const a of html.match(/<a\b[^>]*>/gi) ?? []) {
    const href = /\bhref\s*=\s*"([^"]*)"/i.exec(a);
    if (!href || href[1].trim() === "") v.push({ rule: "link-href", detail: `link missing href: ${a.slice(0, 60)}` });
  }

  // Empty headings.
  for (const m of html.matchAll(/<h([1-6])>\s*<\/h\1>/gi)) v.push({ rule: "empty-heading", detail: `empty <h${m[1]}>` });

  // Heading-level skips (e.g. h1 directly to h3).
  const levels = [...html.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]));
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) v.push({ rule: "heading-skip", detail: `heading jumps h${levels[i - 1]}→h${levels[i]}` });
  }

  return v;
}
