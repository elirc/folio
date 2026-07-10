# ADR-0004 — The editor: ProseMirror, and why not raw contenteditable

**Status:** accepted (S03) · **Relates to:** ADR-0002 (the CRDT roadmap — this is the same call, applied to editing)

## Context

Folio needs a real rich-text editor: block types (paragraph, headings, lists, quote, code, divider),
inline marks, a slash menu, and — soon — a document model that a CRDT can drive (S06+). We must decide the
**document model** and whether to build the editing layer ourselves.

## Decision 1 — Adopt ProseMirror; do not hand-roll contenteditable

`contenteditable` is famously the browser's most treacherous API: every browser normalizes DOM differently,
selection and undo are inconsistent, and there is no document model — just mutated HTML you must reverse-
engineer. Building a serious editor directly on it means re-deriving, badly, what mature libraries already
solved.

ProseMirror gives us, for free: a **document model**, a **schema** (a grammar of legal documents),
**transactions** (every change is a value you can inspect, undo, and — crucially — *transform*), and node
views for custom rendering.

🔗 This is the **same "understand-then-adopt" judgment** ADR-0002 makes about the CRDT, applied one layer
up. The rule: **hand-roll the thing you're learning; adopt the thing that's merely in your way.** Our
novelty budget belongs to *collaboration* (the CRDT arc), which we build up understanding-first. Rich-text
editing is not our novelty — it's a solved, deep problem — so we adopt the mature tool and spend the saved
budget where the actual learning is.

## Decision 2 — Document model = ProseMirror JSON

| Option | Rich structure | Cursors/selection | CRDT-ready | Verdict |
|--------|---------------|-------------------|-----------|---------|
| **Markdown** | lossy (no reliable block ids, poor for nested/rich) | poor | poor | portable but wrong core |
| **Custom block tree** | full control | you build it all | you build it all | reinvents PM, worse |
| **ProseMirror JSON** (chosen) | rich, schema-checked | first-class (PM positions) | y-prosemirror binds Yjs↔PM directly (S07) | ✅ |

**Chosen: ProseMirror JSON.** It's transactional, schema-validated, and — decisively for the capstone —
there's a first-party binding (`y-prosemirror`) that maps a Yjs CRDT onto a PM document in S07. Choosing PM
JSON now is choosing a document model the collaboration layer can adopt later without a rewrite.

## Consequences & deliberate debts

- **Persistence stays naïve.** PM JSON is stored as one blob in `DocState.text`, saved by replacing the
  whole blob (debounced). Fine single-user; **last-write-wins** the moment two people edit — S05 shows it,
  S07 fixes it. The *shape* got richer; the naïveté of the persistence did not, on purpose.
- **Block ids are client-generated with a thin scheme (flaw #2).** Fine for one user; collision-prone under
  concurrent/offline creation. Harvested in S07 when Yjs assigns identity, with a collision test.
- **Scope discipline.** No tables, embeds, or columns. The capstone goes *deep* (collaboration), not *wide*
  (feature count). Headings cap at h3.

*Lesson: spend your novelty budget only where the novelty actually is. Adopt maturity for the swamp; build
understanding for the thing you're actually here to learn.*
