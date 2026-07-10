# Sprint 14 — Search, Export & Polish

**Branch:** `sprint-14/search-export-polish` · **Size:** M/L · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** Round out the product: cross-document search, export (Markdown/HTML/PDF), and the accessibility + UX polish pass — including the genuinely hard problem of an accessible collaborative editor. Largely `[L]` with AI review.

## A — Issues
1. `Cross-doc search: full-text over document content (indexed from the CRDT), scoped by permission`
2. `Export: document → Markdown / HTML / PDF (structure-preserving)`
3. `Accessibility: editor a11y, collaborative-edit announcements, keyboard-complete`
4. `UX polish: onboarding, empty states, mobile view, theming`

## B — Commits
| # | Commit | Notes |
|---|--------|------|
| 1 | `[L] feat(api): search index — extract plain text from Y.Doc on change, Postgres FTS, permission-scoped` | 🔗 Pulse/Harbor FTS lessons; indexing derived from the CRDT (a projection of the doc) |
| 2 | `[L] feat(api): search results with snippets + block-deep-links; respect effective permissions (S11)` | ⚠️ search must never leak a snippet from a doc the user can't read — permission-scoped at query time |
| 3 | `[L] feat(export): Y.Doc/PM → Markdown + HTML (structure-preserving)` | round-trip-ish; documents what's lossy |
| 4 | `[L] feat(export): → PDF (server-side render, fast-forward from prior courses' PDF work)` | 🔗 Meridian/Relay PDF pipeline instincts |
| 5 | `[L] feat(a11y): editor accessibility — semantic structure, keyboard-complete editing, focus management` | |
| 6 | `[A] feat(a11y): collaborative-edit announcements — screen-reader-polite notices of others' edits to the focused region` | AI writes this (the hard, novel part): 🔗 Tracer S14's real-time-a11y lesson, editor-shaped — announcing collaborators' changes without a firehose |
| 7 | `[L] feat(web): onboarding, empty states, mobile-responsive editor, theming (dark/light)` | |
| 8 | `[L] test: search permission-scoping, export fidelity, axe a11y gate, keyboard-only editing e2e` | |
| 9 | `[A] docs: ADR-0012 search indexing from CRDT; a11y patterns; curriculum note` | |

## C — Review order
Search permission-scoping (2, the leak risk) → export fidelity (3) → collaborative-edit a11y announcements (6).

## D — Teaching comments (~8)
- index from the CRDT — 📘 search index is a *projection* of the document (🔗 the read-path/write-path split from Tracer S11); extract text on change, index it; the CRDT is the source, the index is a derived view
- permission-scoped search — ⚠️ the classic search leak: results/snippets from documents the user can't access; scope at query time using S11's resolver — a search index is a permission bypass waiting to happen if you forget
- export fidelity — 📘 every export format loses something (Markdown can't hold comments, PDF can't hold interactivity); document the lossiness honestly rather than pretending round-trips are clean
- collaborative a11y — 🔗 the novel hard part (AI-authored): a screen-reader user needs to know when a collaborator edits near them, but not a firehose of every keystroke; polite, focused-region-only, rate-limited announcements — Tracer S14's lesson, now in a live document
- keyboard-complete editing — 📘 a keyboard user must be able to do *everything* (nesting, block moves, slash menu, comments); the editor's keyboard model (S4) gets its a11y completion here
- axe gate — 🔗 the failing-allowlist pattern (Meridian/Tracer S14), learner-run

## E — Debate
**"Search: index derived text vs search the CRDT structure directly?"** Structure-direct: no sync lag, but slow and complex over Yjs internals. Derived index: fast FTS, but eventually-consistent with edits (index lags a keystroke). **Resolution:** derived FTS index updated on change, accepting slight lag (a just-typed word is searchable a beat later — fine); the ADR notes the lag is bounded and user-invisible. Lesson: *search is a read-path projection; let it lag the write path slightly rather than coupling it to the editor's hot path.*

## F/G — Close
- Squash: `feat(sprint-14): search, export, accessibility, polish (closes #…)`
- Deferred: search filters/operators, more export formats, RTL, offline search.
- Recap idea: *search and export are projections of the document; the a11y challenge is unique to real-time — telling a screen-reader user what changed without drowning them.*
