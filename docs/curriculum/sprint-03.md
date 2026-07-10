# Curriculum Note — Sprint 3: The Block Editor (Single-User)

## Learning objectives
- Build a real rich-text editor on **ProseMirror**, and articulate *why not* raw contenteditable.
- Internalize **schema-as-contract**: illegal documents become unrepresentable.
- Keep the React ⇄ ProseMirror boundary clean — **don't fight PM's DOM.**
- Practice **scope discipline**: go deep (editing model), not wide (feature count).

## Key concepts
- **Adopt the mature tool for the swamp (ADR-0004).** `contenteditable` is the browser's worst API — no
  document model, inconsistent selection/undo across browsers. ProseMirror hands us a model, a schema, and
  transactions. 🔗 This is the *exact same* "understand-then-adopt" call as the CRDT (ADR-0002), one layer
  up: **hand-roll what you're learning; adopt what's merely in your way.** Editing is not our novelty;
  collaboration is. The AI wrote commit 1 (the PM plumbing) precisely to model *what not to hand-roll*.
- **The schema is the contract.** The PM schema is a grammar: `doc = block+`, `list_item = paragraph
  block*`. A transaction that would violate it *cannot be constructed*. You never validate "is this a legal
  doc?" at runtime — 🔗 the same "make illegal states impossible" instinct as every prior course's type
  design, now applied to a document. And it's DOM-agnostic, which is why the whole editor core is unit-
  tested in Node without a browser.
- **Input rules are pattern→transaction.** `# ` → heading is a transaction fired on text input. Because it's
  one transaction, a single undo puts your literal "# " back — that behavior is *free* from building on PM's
  transaction model instead of mutating a contenteditable DOM (where undo is a swamp).
- **Don't fight ProseMirror's DOM.** React owns the chrome (the slash popover); PM owns the editable
  surface. We mount the view once and never re-render its contents from React — every change flows through
  PM transactions. The `<ProseMirrorView/>` boundary is the whole lesson: React and PM each own what they're
  good at, and they meet at a narrow, explicit seam.
- **Whole-doc save is a time bomb (you'll delete this line).** Debounced serialize-and-PUT is fine for one
  user and *catastrophic* for two — it's literally last-write-wins. 🔗 S05 demonstrates it with two windows;
  S07 replaces it with a Yjs update log. Note the ⚠️ on that line now, so you recognize the failure later.

## Planted debt (ledger)
- **Flaw #2 — block ids.** Client-generated, thin random tail; collision-prone under concurrent/offline
  creation. A reviewer should *feel doubt* on that line (see the PR thread). Harvested in **S07** (Yjs
  identity + a real collision test). We ship it as-is on purpose — the fix lands when it actually bites.

## The debate, cashed
**Document model: ProseMirror JSON vs custom block tree vs Markdown?** Resolved: PM JSON — rich,
transactional, and `y-prosemirror` binds it to Yjs in S07. *Hand-roll the thing you're learning; adopt the
thing that's merely in your way.*

## Exercise questions
1. Name three concrete things ProseMirror gives you that raw contenteditable does not. Which one matters
   most for S07?
2. Why can the entire editor core be tested in Node with no DOM? What single import would break that, and
   where does it (correctly) live instead?
3. Look at `makeBlockId`. Construct a scenario where two blocks get the same id. Why is it acceptable to
   ship this now and fix it in S07 rather than today?
4. Trace one debounced save with two browser windows open. Exactly which keystrokes are lost, and why?

## Further reading
- ProseMirror guide (schema, transactions, node views) · "Why contenteditable is terrible" (Medium/Medley) ·
  y-prosemirror (coming S07) · Fred Brooks, "Plan to throw one away"
