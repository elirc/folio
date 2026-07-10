# ADR-0005 — Editor state classification: document vs. view

**Status:** accepted (S04) · **Relates to:** ADR-0002 (collaboration roadmap), ADR-0004 (the editor)

## Context

The editor is single-user today, but S07 makes it collaborative. When that happens, **every piece of state
must already be labelled**: is it *document* state (part of the shared document — serialized, persisted,
and synced to all collaborators) or *view* state (per-user, local, never synced)? Mislabelling is invisible
now and disastrous under sync. 🔗 Tracer's durable-vs-ephemeral state lesson, in editor form.

The forcing example is **collapse/toggle state.**

## Decision — classify each datum before collaboration arrives

| Datum | Class | Rationale |
|-------|-------|-----------|
| Block content, block ids, headings, list nesting | **document** | the document itself |
| **Collapsed/toggled** state of a section | **document** | it's part of the *outline's meaning* (Notion's model) — everyone sees the same structure |
| Checkbox `checked` on a todo | **document** | a shared fact about the task |
| Text selection / cursor position | **view** (→ *presence* in S09) | mine, not yours — syncing it as document state would fight everyone's cursor |
| Scroll position, focus, hover | **view** | local, ephemeral |
| Slash-menu open + query | **view** | transient UI |

**Collapse is document state.** A collapsed section changes what the outline *means*, so it belongs to the
document and syncs. We store `collapsed` as an attribute *in the doc* (it serializes to JSON and, in S07,
into the CRDT). The alternative — per-user collapse overlays — is a legitimate future feature, noted below,
but the *default* structural toggle is shared.

## Why this can't wait for S07

If you defer classification until sync exists, you discover your mistakes as bugs: collapse a section and
it collapses for everyone unexpectedly (if you wrongly synced view state), or your cursor teleports across
collaborators (if you wrongly made presence document state). By labelling now, S07 is a *mechanical* switch
— document state flows into the CRDT, view state stays local — with no re-litigation of what each datum is.

## Consequences

- `collapsed` lives on `list_item`/`todo_item` as a doc attribute (serializes; syncs in S07).
- Cursor/selection is explicitly **view** now and becomes **presence** (a separate, ephemeral channel) in
  S09 — never document state.
- Deferred: per-user collapse overlays (a view-layer projection on top of the shared structure).

*Lesson: label every editor datum document-or-view before collaboration exists, or S07 will sync the wrong
things — your scroll position to everyone, or nobody's collapse to anyone.*
