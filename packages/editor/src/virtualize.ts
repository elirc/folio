/**
 * Virtualized block rendering (S12) — the pure geometry behind rendering only what's on screen. The DOM
 * integration (ProseMirror decorations, scroll handling) lives in the web app; the *range math* lives here
 * so the tricky boundary conditions are unit-tested without a browser.
 *
 * ⚠️ Virtualizing a ProseMirror document is subtle: selection mapping, find-in-page, scroll-to-block, and
 * collaborative cursors pointing at UNRENDERED blocks must all keep working. The correctness obligations are
 * why we compute an explicit visible range + overscan (render a margin beyond the viewport) rather than
 * hiding blocks reactively — an off-by-one here drops a block from the render and breaks scroll position.
 */

export interface VisibleRange {
  /** First block index to render (inclusive). */
  start: number;
  /** Last block index to render (exclusive). */
  end: number;
  /** Total scrollable height (so the scrollbar is correct even though most blocks aren't rendered). */
  totalHeight: number;
  /** Pixel offset to translate the rendered window to its true position. */
  offsetTop: number;
}

/**
 * Given cumulative block heights, the scroll position, and the viewport, compute which blocks to render
 * (plus `overscan` extra on each side to avoid blank flashes while scrolling fast).
 */
export function visibleRange(
  blockHeights: readonly number[],
  scrollTop: number,
  viewportHeight: number,
  overscan = 5,
): VisibleRange {
  const n = blockHeights.length;
  const offsets: number[] = new Array(n + 1);
  offsets[0] = 0;
  for (let i = 0; i < n; i++) offsets[i + 1] = offsets[i]! + blockHeights[i]!;
  const totalHeight = offsets[n]!;

  if (n === 0) return { start: 0, end: 0, totalHeight: 0, offsetTop: 0 };

  // First block whose bottom is below the viewport top.
  let start = 0;
  while (start < n && offsets[start + 1]! <= scrollTop) start++;
  // Last block whose top is above the viewport bottom.
  const bottom = scrollTop + viewportHeight;
  let end = start;
  while (end < n && offsets[end]! < bottom) end++;

  start = Math.max(0, start - overscan);
  end = Math.min(n, end + overscan);
  return { start, end, totalHeight, offsetTop: offsets[start]! };
}
