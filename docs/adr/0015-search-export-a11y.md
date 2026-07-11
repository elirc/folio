# ADR-0015 — Search (indexed from the CRDT), export, and accessibility

**Status:** accepted (S14) · **Relates to:** ADR-0011 (persistence), ADR-0012 (ACL inheritance)

## Context

Rounding out the product: cross-document search, export to Markdown/HTML/PDF, and an accessibility pass —
including the genuinely novel problem of an *accessible collaborative editor*.

## Decisions

### 1. Search is a derived projection of the CRDT (not a query over its internals)
On change, we extract the document's plain text (`extractPlainText`) and store it in `DocState.searchText`,
which Postgres FTS queries. 📘 **The CRDT is the source; the index is a projection.** 🔗 The read-path/
write-path split: the write path (the Y.Doc) stays hot and authoritative; search is a separate,
eventually-consistent read view. A just-typed word is searchable a beat later — bounded, user-invisible lag,
and the right trade.

**The debate — index derived text vs search the CRDT structure directly:** structure-direct has no sync lag
but is slow and complex over Yjs internals; a derived FTS index is fast but lags a keystroke. **Resolved:**
derived FTS, accepting the slight lag. *Lesson: search is a read-path projection; let it lag the write path
slightly rather than coupling it to the editor's hot path.*

### 2. ⚠️ Search is permission-scoped at query time
The classic search leak: results and snippets from documents the user can't read. Every hit is scoped
through the S11 effective-permission resolver before it leaves the server (`scopeSearchResults`). **A search
index is a permission bypass waiting to happen** — content leaks through snippets if you forget.

### 3. Export is a lossy projection, and we say so
`pmToMarkdown` / `pmToHtml` are pure, structure-preserving converters over PM JSON. Every format loses
something (`EXPORT_LOSSINESS`): Markdown drops comments/suggestions/block-ids; HTML drops
editability/cursors; PDF drops everything editable. We serve the format and surface the lossiness rather than
pretending a round-trip is clean. PDF is a deferred server-side render (fast-forward).

### 4. Accessibility, including the real-time-novel part
- **Keyboard-complete editing** (the S04 keyboard model completed): nesting, block moves, slash menu,
  comments all reachable without a mouse.
- 🔗 **Collaborative-edit announcements** (the novel hard part): a screen-reader user must know when a
  collaborator edits *near them* — but not a firehose. `EditAnnouncer` is **polite, focused-region-only, and
  rate-limited**, coalescing a burst into one summary ("Ann made 3 edits nearby"). A firehose is worse than
  silence. (Tracer S14's real-time-a11y lesson, editor-shaped.)
- **A DOM-less a11y gate:** `checkA11y(html)` runs axe-style rules (img-alt, link-href, empty-heading,
  heading-skip) over the *exported HTML string* in Node CI — no Playwright/browser needed. `test:a11y` is a
  CI gate. Not exhaustive, but it catches the regressions that matter and stays DB/DOM-less.

## Consequences

- `DocState.searchText` is the derived index; `test:a11y` joins the capstone CI gates.
- Deferred: search filters/operators, more export formats, RTL, offline search, full axe-core browser audit.

*Lesson: search and export are projections of the document; the a11y challenge unique to real-time is telling
a screen-reader user what changed without drowning them.*
