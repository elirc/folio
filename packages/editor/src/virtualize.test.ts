import { describe, it, expect } from "vitest";
import { visibleRange } from "./virtualize";

// 100 blocks, 20px tall each ⇒ 2000px total.
const heights = Array.from({ length: 100 }, () => 20);

describe("virtualization range math (S12)", () => {
  it("renders only the viewport window (+ overscan)", () => {
    // viewport 100px tall at the top ⇒ blocks 0..5 visible; overscan 5 ⇒ start 0, end ~10.
    const r = visibleRange(heights, 0, 100, 5);
    expect(r.start).toBe(0);
    expect(r.end).toBeLessThanOrEqual(11);
    expect(r.totalHeight).toBe(2000);
    expect(r.offsetTop).toBe(0);
  });

  it("scrolled to the middle renders a middle window with the right offset", () => {
    // scrollTop 1000 ⇒ first visible block index 50; overscan pulls start back to 45.
    const r = visibleRange(heights, 1000, 100, 5);
    expect(r.start).toBe(45);
    expect(r.offsetTop).toBe(45 * 20);
    expect(r.end).toBeGreaterThan(50);
  });

  it("never drops the last block at the bottom (off-by-one guard)", () => {
    const r = visibleRange(heights, 2000 - 100, 100, 0);
    expect(r.end).toBe(100); // includes the final block
  });

  it("handles an empty document", () => {
    expect(visibleRange([], 0, 500)).toEqual({ start: 0, end: 0, totalHeight: 0, offsetTop: 0 });
  });

  it("variable block heights compute correct offsets", () => {
    const varied = [100, 50, 200, 30, 300];
    const r = visibleRange(varied, 120, 100, 0); // starts inside block 1 (100..150)
    expect(r.start).toBe(1);
    expect(r.offsetTop).toBe(100);
  });
});
