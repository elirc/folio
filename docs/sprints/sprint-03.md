# Sprint 03 — The Block Editor (Single-User)

**Branch:** `sprint-03/block-editor` · **Size:** L · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** A real rich-text editor: ProseMirror with a block-based schema (paragraph, headings, lists, quote, code, divider), a slash menu, and inline marks. Single-user only — collaboration is deliberately absent until we've felt its need (S5). Mixed `[L]`/`[A]`: the AI provides the ProseMirror schema scaffolding, the learner builds blocks and the slash menu.

## A — Issues
1. `ProseMirror integration: schema, editor state, React binding`
2. `Block types: paragraph, h1-3, bullet/ordered/todo list, quote, code, divider`
3. `Inline marks: bold, italic, code, link; input rules (markdown-style)`
4. `Slash menu (/ to insert blocks) + block ids`

## B — Commits
| # | Commit | Notes |
|---|--------|------|
| 1 | `[A] feat(editor): ProseMirror schema scaffolding + React view binding` | AI writes the tricky PM plumbing; the learner studies it (contenteditable is a swamp we don't hand-roll — the S-level version of "adopt the real thing") |
| 2 | `[L] feat(editor): block node types + node views` | learner implements each block against the schema |
| 3 | `[L] feat(editor): inline marks + input rules (**bold**, # heading, - list)` | |
| 4 | `[L] feat(editor): slash menu — filterable block inserter` | 🔗 the learner's command-palette instincts from Tracer S4/S11 transfer |
| 5 | `[L] feat(editor): block ids — [client-generated, simple scheme]` | **[flaw #2]** ids risk collision under concurrent/offline creation (harvest S7) |
| 6 | `[L] feat(db): document stored as ProseMirror JSON (still single-user, whole-doc save)` | debounced autosave; this whole-doc-save model is what S5 will break and S7 will replace |
| 7 | `[L] test: schema validity, block operations, input rules, slash menu` | |
| 8 | `[A] docs: ADR-0004 ProseMirror + why-not-contenteditable-raw; curriculum note` | |

## C — Review order
The PM schema (1, AI ref) → block node views (2, L) → block ids (5, L — note the scheme) → the whole-doc save (6).

## D — Teaching comments (~10)
- ProseMirror over raw contenteditable — 📘 contenteditable is famously the browser's worst API; ProseMirror gives a real document model, transactions, and a schema — this is "adopt the mature tool" applied to editing; the AI writing commit 1 models *why* some things aren't hand-rolled
- schema as contract — 📘 the PM schema defines what documents are *possible*; invalid states become unrepresentable — 🔗 the same "make illegal states impossible" instinct as every prior course's type design
- node views — 🔍 review-lens (on L's commit 2): where React and ProseMirror's own DOM management collide; the node-view boundary and the "don't fight PM's DOM" rule
- input rules — 📘 markdown-style input rules are transactions triggered by patterns; the learner's implementation reviewed for edge cases (undo of an input rule, mid-word triggers)
- block ids scheme — *(the AI review of L's commit 5 nudges toward uniqueness concerns without fully flagging the collision risk — flaw #2; a good reviewer plants doubt, and S7 resolves it)*
- whole-doc save — 🔗 review-lens: debounced whole-document save is fine single-user and *catastrophic* multiplayer (it's literally last-write-wins) — S5 will demonstrate; note this line, you'll delete it in S7

## E — Debate
**"Document model: ProseMirror JSON vs a custom block tree vs Markdown?"** Markdown: portable, but lossy for rich structure and cursors. Custom: full control, reinvents PM badly. PM JSON: rich, transactional, library-backed. **Resolution:** ProseMirror JSON — and the ADR is explicit that this is the same "understand-then-adopt" call as the coming CRDT decision: use the mature tool for the swampy part, spend your novelty budget on what's actually novel (the collaboration). Lesson: *hand-roll the thing you're learning; adopt the thing that's merely in your way.*

## F/G — Close
- Squash: `feat(sprint-03): block editor, slash menu, marks (closes #…)`
- Deferred: tables, embeds, columns (scope discipline — capstone goes deep, not wide).
- Ledger: flaw #2 recorded.
- Recap idea: *we hand-rolled the collaboration understanding (coming) but adopted ProseMirror for editing — spend novelty budget only where the novelty is.*
