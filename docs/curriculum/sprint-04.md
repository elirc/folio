# Curriculum Note — Sprint 4: Editor Depth (Nesting, Media, Keyboard)

## Learning objectives
- Express structural edits (nesting) as **ProseMirror transactions**, not CSS — because S07 syncs the steps.
- **Classify every editor datum** document-vs-view *before* collaboration exists (ADR-0005).
- Map screen gestures (drag) to **document positions** with the risk isolated in a pure, tested core.
- Reuse your own abstraction: port **StorageService** a fourth time.
- Adopt a **latency budget** while the editor is still fast enough to meet it trivially.

## Key concepts
- **Nesting is structural, not cosmetic.** Indent doesn't add a margin — it makes a list item a *child* of
  the one above, changing the document tree. 📘 Learning to express intent as PM steps pays off enormously
  in S07: Yjs syncs exactly these structural steps, and "a CSS indent" would sync nothing meaningful.
- **Classify state before sync (ADR-0005).** Is "is this toggle open?" document state (syncs to everyone,
  Notion's model) or per-user view state? We chose *document* for structural collapse — it's part of the
  outline's meaning. ⚠️ Get this wrong and S07 syncs your scroll position to everyone, or nobody's collapse
  to anyone. 🔗 Tracer's durable-vs-ephemeral lesson, editor-shaped. **Cursor/selection is view now →
  becomes *presence* (a separate ephemeral channel) in S09 — never document state.**
- **Screen coords → document positions is where drag bugs live.** We put the *document surgery*
  (`moveTopLevelBlock`) in a pure, unit-tested core and kept the view (handles, hit-testing) thin. Every
  arithmetic trap — drop on self, drop at the end, index shift after deletion — is a test, not an incident.
- **Block-boundary keys are the swamp.** Enter continues a list, Enter on an *empty* item exits it,
  Backspace at the *start* of a nested item outdents (rather than merging text up). The **test matrix is the
  deliverable** — the code is short; the edge cases are the work.
- **Port the abstraction again.** `StorageService` returns for the fourth time (🔗 Meridian). The interface
  hides where bytes live; the editor and API depend only on it. Reusing your own prior abstraction *is* the
  reuse lesson made literal.
- **Adopt the latency budget now (`latency-budget.md`).** ≤16 ms/keystroke = one frame. We set it while the
  editor trivially meets it, so it's a *constraint* on every later choice, not a rescue mission. Enforced by
  a CI gate in S12. *A perf number adopted before shipping is a constraint; after shipping, an excuse.*

## The debate, cashed
**Toggle/collapse state: document or per-user?** Resolved: document-level for structural toggles (they're
part of the outline's meaning), per-user overlays noted as a future option. *Classify every datum
document-or-view before collaboration arrives.*

## Exercise questions
1. Indent a list item, then serialize the doc to JSON. What structurally changed vs. a CSS `margin-left`?
   Why does that difference matter to Yjs in S07?
2. For each of {collapsed, checked, cursor position, scroll offset, slash query}, label it document or view
   and justify. Which one, mislabelled, would be the worst bug under sync?
3. Read `moveTopLevelBlock`. Why is "drop just after myself" a no-op, and why must the insert index be
   recomputed after the delete?
4. Write the Backspace test matrix for a nested list: at start of item / mid-text / empty item / first item.
   Which cases outdent, which delete, which do nothing?

## Further reading
- ProseMirror transactions & steps · prosemirror-schema-list (sink/lift) · dnd-kit (the production DnD
  upgrade path) · "Local-first" state classification · frame budgets / RAIL model
