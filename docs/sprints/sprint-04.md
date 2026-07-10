# Sprint 04 — Editor Depth: Nesting, Media & Keyboard

**Branch:** `sprint-04/editor-depth` · **Size:** L · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** Make the editor feel real: nested blocks (indent/outdent, toggle lists), drag-to-reorder blocks, media (image upload/embed), and a keyboard-first interaction model. Still single-user. Largely `[L]` with AI review — the learner is building a product now.

## A — Issues
1. `Nested blocks: indent/outdent, nesting depth, toggle (collapsible) blocks`
2. `Block drag-and-drop reorder (with nesting) + block handles`
3. `Media: image upload (StorageService — 🔗 Meridian S4), embeds`
4. `Keyboard model: block navigation, selection, shortcuts, markdown continuations`

## B — Commits
| # | Commit | Notes |
|---|--------|------|
| 1 | `[L] feat(editor): nesting — indent/outdent transactions, depth limits, list nesting` | ProseMirror's structural transactions; the learner learns to think in PM steps |
| 2 | `[L] feat(editor): toggle/collapsible blocks (persisted collapse state)` | collapse is view state vs document state — a distinction the learner must get right (🔗 Tracer's three-kinds-of-state) |
| 3 | `[L] feat(editor): block DnD reorder with nesting (dnd-kit + PM positions)` | mapping screen drops to document positions — the hard part; AI review focuses here |
| 4 | `[A] feat(api+editor): media — StorageService (ported from Meridian) + image blocks + paste/drop upload` | AI ports the storage interface; learner wires the block |
| 5 | `[L] feat(editor): keyboard model — arrow/block nav, shift-select blocks, shortcuts, enter/backspace semantics at block edges` | block-boundary key handling is a nest of edge cases (backspace at start of a nested list item…) |
| 6 | `[L] feat(editor): markdown continuations (enter in a list continues it; double-enter exits)` | |
| 7 | `[L] test: nesting ops, DnD position mapping, keyboard edge cases, upload` | |
| 8 | `[A] docs: latency-budget.md (editor interactions <16ms/keystroke); curriculum note` | 🔗 Tracer's budget discipline; enforced in S12 |

## C — Review order
Nesting transactions (1) → DnD position mapping (3, the hard part) → block-boundary keyboard semantics (5).

## D — Teaching comments (~9)
- PM structural transactions — 📘 nesting isn't a CSS indent, it's a document-structure change; the learner learns to express intent as PM steps (which will matter enormously when Yjs syncs those steps in S7)
- collapse: view vs doc state — ⚠️ is "is this toggle open" part of the document (synced to collaborators) or per-user view state? a real product decision (Notion syncs it); getting the boundary wrong syncs the wrong things — 🔗 Tracer's durable-vs-ephemeral lesson, editor-shaped
- DnD position mapping — 🔍 review-lens (on L's commit 3): screen coordinates → PM document positions is where drag bugs breed; the review drills the edge cases (drop between nested items, drop at doc end)
- block-boundary keys — ⚠️ backspace at the start of a nested block, enter at the end of a list — the combinatorial edge-case swamp of editors; the test matrix is the deliverable
- latency budget — 🔗 the editor must feel instant; <16ms per keystroke is the frame budget; instrument now (Tracer S5 lesson), enforce in S12
- media via ported StorageService — 🔗 the learner's fourth encounter with this interface; porting their own prior abstraction is the reuse lesson made literal

## E — Debate
**"Toggle/collapse state: document or per-user?"** Document: everyone sees the same collapsed structure (Notion's choice). Per-user: my collapse doesn't disturb your view. **Resolution:** document-level for structural toggles (they're part of the outline's meaning), with a note that per-user view overlays are a future option. Lesson: *every piece of editor state must be classified — document (synced) or view (local) — before collaboration arrives, or S7 will sync your scroll position to everyone.*

## F/G — Close
- Squash: `feat(sprint-04): nesting, media, keyboard-first editing (closes #…)`
- Deferred: tables, columns, nested-page embeds (scope discipline).
- Recap idea: *the editor is now real and single-user — every state decision here becomes a sync decision in S7, so classify carefully.*
