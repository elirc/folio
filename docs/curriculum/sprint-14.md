# Curriculum Note — Sprint 14: Search, Export & Accessibility

## Learning objectives
- Build search as a **derived projection** of the CRDT, and scope it by permission (no leaks).
- Treat export as a **lossy projection** and document the loss honestly.
- Solve the accessibility problem unique to real-time: announcing collaborators' edits without a firehose.

## Key concepts
- **Search is a read-path projection.** Extract plain text on change; index it; the Y.Doc is the source, the
  index a derived view. 🔗 The read/write-path split — keep the write path (editor) hot; let search lag a
  keystroke. Coupling search to the editor's hot path would slow typing to keep an index perfectly fresh,
  for zero user benefit.
- **⚠️ The search leak.** A search index returns snippets from every matching doc — *including ones you can't
  read*. Scope at query time with the S11 resolver. This is one of the most common real access-control bugs:
  the permission model is right, but a *derived* surface (search, export, an activity feed) forgets to apply
  it and leaks content.
- **Export is lossy — say so.** Markdown can't hold comments/suggestions; HTML can't hold editability; PDF
  can't hold anything editable. `EXPORT_LOSSINESS` names the drops. Honesty beats a fake "clean round-trip."
- **Collaborative a11y is the novel hard part.** A screen-reader user needs to know a collaborator edited
  *near them* — but a firehose of every keystroke makes the editor unusable. The rule: **polite, focused-
  region-only, rate-limited, coalesced.** A single "Ann made 3 edits nearby" beats 3 interruptions. 🔗
  Tracer S14's real-time-a11y lesson, editor-shaped.
- **A DOM-less a11y gate.** We run axe-style rules over the *exported HTML string* in Node — `test:a11y` in CI
  — instead of a flaky browser audit. It catches the editor's real regressions (missing alt, empty headings,
  heading skips) while staying DB/DOM-less like every other gate.

## The debate, cashed
**Search: index derived text vs search the CRDT structure directly?** Resolved: derived FTS index updated on
change, accepting bounded, user-invisible lag. *Search is a read-path projection; let it lag the write path
slightly rather than coupling it to the editor's hot path.*

## Exercise questions
1. Why is search a *projection*, and what does that buy you vs querying the Y.Doc directly on each search?
2. Construct the search-leak bug: a user searches and sees a snippet from a doc they can't open. Where
   exactly is the missing check?
3. For each export format, name one thing it can't represent. Why document this instead of hiding it?
4. Design the announcement for: 3 collaborators each type in your focused paragraph within 1 second. What
   does a screen-reader user hear, and why not more?

## Further reading
- Postgres full-text search · "read models / CQRS projections" · WAI-ARIA live regions (aria-live polite) ·
  axe-core rules · ADR-0015
