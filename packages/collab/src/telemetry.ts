/**
 * Sync observability (S15). The metrics that describe a COLLABORATIVE system's health — sync lag, document
 * load time, active connections, update rate — plus the one metric unique to a CRDT: convergence health.
 * All pure and bounded-memory, so they run anywhere and never leak.
 *
 * 📘 You instrument the invariants your architecture PROMISES. A CRDT promises convergence, so we monitor
 * *divergence* — and because divergence should be impossible, an alert here is a high-signal "real bug,"
 * never routine noise.
 */

/** A fixed-bucket latency histogram (bounded memory — no unbounded sample retention). */
export class LatencyHistogram {
  private readonly buckets: number[];
  private count = 0;
  private sum = 0;
  constructor(private readonly bounds = [1, 5, 16, 50, 100, 250, 1000]) {
    this.buckets = new Array(bounds.length + 1).fill(0);
  }
  observe(ms: number): void {
    this.count++;
    this.sum += ms;
    let i = 0;
    while (i < this.bounds.length && ms > this.bounds[i]!) i++;
    this.buckets[i]!++;
  }
  /** Approximate percentile from the bucket bounds (upper edge of the bucket the p falls in). */
  percentile(p: number): number {
    if (this.count === 0) return 0;
    const target = Math.ceil((p / 100) * this.count);
    let cum = 0;
    for (let i = 0; i < this.buckets.length; i++) {
      cum += this.buckets[i]!;
      if (cum >= target) return this.bounds[i] ?? Infinity;
    }
    return Infinity;
  }
  get mean(): number {
    return this.count === 0 ? 0 : this.sum / this.count;
  }
  get total(): number {
    return this.count;
  }
}

/** A sliding-window rate counter (events per second over the window). */
export class RateCounter {
  private events: number[] = [];
  constructor(private readonly windowMs = 60_000) {}
  tick(now: number): void {
    this.events.push(now);
    this.trim(now);
  }
  ratePerSec(now: number): number {
    this.trim(now);
    return this.events.length / (this.windowMs / 1000);
  }
  private trim(now: number): void {
    const cutoff = now - this.windowMs;
    let i = 0;
    while (i < this.events.length && this.events[i]! < cutoff) i++;
    if (i > 0) this.events = this.events.slice(i);
  }
}
