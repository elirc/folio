# Editor Latency Budget (S04 → enforced S12)

An editor that stutters feels broken no matter how correct it is. We set the budget **now**, while the
editor is small and fast, so the number is a design constraint the whole way — not a rescue mission after
it's already slow. 🔗 Tracer's budget discipline (instrument early, enforce later).

## The budgets

| Interaction | Budget | Why |
|-------------|--------|-----|
| **Keystroke → paint** | **≤ 16 ms** | one 60 fps frame. Above this, typing visibly lags the cursor. |
| Slash menu open | ≤ 50 ms | a menu should feel instantaneous. |
| Block drag frame | ≤ 16 ms | dragging must track the pointer at frame rate. |
| Document open (cold) | ≤ 200 ms | perceived as "instant enough" for a navigation. |
| Large doc (10k blocks) keystroke | ≤ 16 ms | the budget must hold at scale — the S12 stress target. |

## Why 16 ms per keystroke specifically

At 60 fps a frame is ~16.7 ms. Every keystroke runs: PM transaction apply → decoration recompute → DOM
patch → (debounced) serialize. Only the first three are on the critical path; the save is deliberately
off it (debounced, S03). If any on-path step is O(document size), you blow the budget on big docs — which
is exactly the failure S12 hunts (and why fractional keys, not array resequencing, back ordering).

## What we do now vs. later

- **Now (S04):** keep per-keystroke work O(local): decorations for block handles are computed from the doc
  but cheap; the expensive save is debounced off-path. No measurement gate yet — the editor is trivially
  under budget.
- **Later (S12):** a `perf:budget` CI gate measures keystroke-to-paint on a synthetic large document and
  fails the build if p95 exceeds 16 ms. Instrument now, enforce when the numbers can actually regress.

## The rule

*Set the frame budget before you can violate it. A performance number you adopt after shipping is a
negotiation; one you adopt before is a constraint. Constraints shape design; negotiations shape excuses.*
