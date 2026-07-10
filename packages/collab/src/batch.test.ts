import { describe, it, expect } from "vitest";
import { Batcher } from "./batch";

/** A manual scheduler: the test decides when the frame "fires". */
function manualScheduler() {
  const queue: (() => void)[] = [];
  const schedule = (flush: () => void) => queue.push(flush);
  const tick = () => {
    const fns = queue.splice(0);
    for (const f of fns) f();
  };
  return { schedule, tick };
}

describe("Batcher (S12) — coalesce to one flush per frame", () => {
  it("many pushes in one window → exactly ONE flush with the whole batch", () => {
    const { schedule, tick } = manualScheduler();
    const flushes: number[][] = [];
    const b = new Batcher<number>((batch) => flushes.push(batch), schedule);

    for (let i = 0; i < 50; i++) b.push(i); // 50 cursor moves in one frame
    expect(flushes).toHaveLength(0); // nothing yet — not flushed until the frame fires
    tick();
    expect(flushes).toHaveLength(1); // ONE flush…
    expect(flushes[0]).toHaveLength(50); // …carrying all 50
  });

  it("pushes across separate frames flush separately", () => {
    const { schedule, tick } = manualScheduler();
    const flushes: number[][] = [];
    const b = new Batcher<number>((batch) => flushes.push(batch), schedule);
    b.push(1);
    tick();
    b.push(2);
    b.push(3);
    tick();
    expect(flushes.map((f) => f.length)).toEqual([1, 2]);
  });

  it("signal() coalesces payload-free events to one flush", () => {
    const { schedule, tick } = manualScheduler();
    let flushCount = 0;
    const b = new Batcher<never>(() => flushCount++, schedule);
    for (let i = 0; i < 30; i++) b.signal();
    tick();
    expect(flushCount).toBe(1);
  });
});
