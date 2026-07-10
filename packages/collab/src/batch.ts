/**
 * Coalescing batcher (S12). Many rapid events — 50 cursors moving, a burst of keystrokes — must not become
 * many renders or many network messages. A batcher collects calls and flushes them ONCE per frame.
 *
 * 📘 THE LATENCY/THROUGHPUT KNOB, AGAIN. A per-event broadcast floods; coalescing to ~1 frame (rAF, ~16ms)
 * is nearly invisible to the user and hugely cheaper. 🔗 Tracer S12's flush-window lesson, CRDT-shaped: the
 * scheduler is injectable so the same logic drives cursor-render coalescing, awareness relay, and update
 * broadcast — and so it's testable without a real animation frame.
 */
export type Scheduler = (flush: () => void) => void;

/** Default scheduler: one animation frame (falls back to a ~16ms timer off the main thread / in tests). */
export const rafScheduler: Scheduler =
  typeof requestAnimationFrame === "function"
    ? (flush) => requestAnimationFrame(() => flush())
    : (flush) => setTimeout(flush, 16) as unknown as void;

/**
 * Coalesce calls to `flush` into one per scheduling window. `push(item)` accumulates; the accumulated batch
 * is delivered to `onFlush` exactly once per window, no matter how many pushes happened.
 */
export class Batcher<T> {
  private pending: T[] = [];
  private scheduled = false;

  constructor(
    private readonly onFlush: (batch: T[]) => void,
    private readonly schedule: Scheduler = rafScheduler,
  ) {}

  push(item: T): void {
    this.pending.push(item);
    this.scheduleFlush();
  }

  /** Signal an event with no payload (e.g. "cursor moved") — coalesced to one flush. */
  signal(): void {
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    this.schedule(() => this.flush());
  }

  flush(): void {
    this.scheduled = false;
    if (this.pending.length === 0) {
      this.onFlush([]);
      return;
    }
    const batch = this.pending;
    this.pending = [];
    this.onFlush(batch);
  }
}
