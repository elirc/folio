/**
 * Element identity & logical time (S06). The keystone of the whole CRDT.
 *
 * 📘 EVERY ELEMENT HAS A GLOBALLY-UNIQUE, IMMUTABLE IDENTITY — not a position. In S05, sync worked on
 * *positions* ("offset 42"), and positions shift when anyone edits, which is exactly why LWW couldn't
 * merge. A CRDT works on *identities* ("the char created by site B at clock 7"), which never change. That
 * one substitution — position → identity — is what makes concurrent edits mergeable. Hold onto it; it is
 * the difference between S05 and everything after.
 */

export type SiteId = string;

/** An operation/element id: a Lamport clock paired with the site that minted it. Immutable forever. */
export interface OpId {
  site: SiteId;
  clock: number;
}

export function opIdEq(a: OpId | null, b: OpId | null): boolean {
  if (a === null || b === null) return a === b;
  return a.clock === b.clock && a.site === b.site;
}

/**
 * A TOTAL order over ids: clock first, then site as the tie-break. Total + deterministic is essential —
 * every replica must order concurrent ids identically, or they'd diverge. Wall-clock time can't do this
 * (clocks skew, ties happen); a Lamport clock + site id can.
 */
export function opIdCmp(a: OpId, b: OpId): number {
  if (a.clock !== b.clock) return a.clock - b.clock;
  return a.site < b.site ? -1 : a.site > b.site ? 1 : 0;
}

/** A string key for map lookups. */
export function opIdKey(id: OpId): string {
  return `${id.site}@${id.clock}`;
}

/**
 * A Lamport clock. 🔗 The LWW-timestamp lesson from earlier courses, now load-bearing: logical time orders
 * events WITHOUT trusting wall clocks. `tick` advances for a local event; `observe` bumps past a remote
 * event's time so this site's next id is causally after everything it has seen (happens-before).
 */
export class LamportClock {
  constructor(
    public readonly site: SiteId,
    private value = 0,
  ) {}

  /** Advance for a local event and return the fresh id. */
  tick(): OpId {
    this.value += 1;
    return { site: this.site, clock: this.value };
  }

  /** Merge in a remote event's time so our future ids come after it. */
  observe(id: OpId): void {
    this.value = Math.max(this.value, id.clock);
  }

  get now(): number {
    return this.value;
  }
}
