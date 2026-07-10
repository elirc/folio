# ADR-0008 — Adopt Yjs for production CRDT (with crdt-101 as the baseline)

**Status:** accepted (S07) · **Closes:** flaw #1 (LWW) and flaw #2 (block ids) · **Baseline:** ADR-0007 (crdt-101)

## Context

S06 proved we understand CRDTs by building one (crdt-101) and fuzzing it to convergence. S07 is the payoff:
adopt a production CRDT for Folio's rich-text, real-time editor. This ADR is a *knowledgeable* evaluation —
it reads like a peer review because we built the toy first.

## The candidates

| | crdt-101 (ours) | Automerge | **Yjs (chosen)** |
|--|-----------------|-----------|------------------|
| Convergence | ✅ fuzzed, plaintext only | ✅ | ✅ (battle-tested a decade) |
| Rich text (blocks, marks, nested PM) | ❌ research-grade for us | ⚠️ JSON-native, historically heavier for large text | ✅ `y-prosemirror` binding |
| Performance / memory | ❌ O(n) scans, unbounded tombstones | ⚠️ historically heavier | ✅ optimized structs, delete-set GC |
| ProseMirror binding | ❌ we'd build it | ⚠️ community | ✅ first-party `y-prosemirror` |
| Presence / cursors | ❌ | ⚠️ | ✅ awareness protocol |
| Offline / persistence | ❌ | ✅ | ✅ y-indexeddb, update log |

**Chosen: Yjs.** It's fast, mature, has the ProseMirror binding we need, an awareness protocol for
presence, and a rich ecosystem. Automerge is elegant and JSON-native but historically heavier for large
text documents — for a text editor, Yjs's optimized structures win. crdt-101 is frozen: it taught us; it
ships nothing.

**And the honest baseline for "why not build our own" is crdt-101 itself:** we know exactly what we'd have
to build (rich-text ordering, tombstone GC, a binding, awareness, persistence, performance work) because we
built the plaintext core and felt where the cliffs are. That's what makes "adopt" an engineering decision.

## What changes

1. **Y.Doc is the document.** A Folio doc is a `Y.XmlFragment` named "prosemirror"; `y-prosemirror`'s
   `ySyncPlugin` binds it to the editor, so **every PM transaction becomes a Yjs update** — the same
   operations we built by hand in crdt-101, industrial.
2. **Custom provider, not y-websocket.** We build our own provider (protocol.ts + provider.ts) so we OWN the
   transport we depend on — the thesis of the whole curriculum is against black boxes you rely on. The
   protocol is crdt-101's "merge two replicas" as a wire handshake: state-vector exchange → delta → update
   relay.
3. **Server is authoritative.** yroom.ts holds the Y.Doc per document, answers sync, persists the update log
   (`DocState.yUpdate`), and relays updates + awareness. 🔗 Tracer's log + pub/sub sync-spine, carrying CRDT
   updates; Redis-fanout across instances is a hook on the persistence callback.
4. **Migration.** Old ProseMirror-JSON (`DocState.text`) is read once and expanded into a Y.Doc on first
   open — the expand/backfill playbook, fifth time.

## Flaws closed

- **#1 (LWW clobber)** — a real CRDT replaces whole-doc last-write-wins. **The S05 damning test flips green:**
  the two-client concurrent edit that ate a paragraph now converges, keeping both edits.
- **#2 (block ids)** — Yjs assigns identity via `(clientId, clock)`, globally unique by construction. The
  collision-prone S03 `Math.random` scheme is retired; a collision test proves the old could collide and the
  new cannot. *Identity, not chance* — the S06 keystone, cashed.

## Deliberate debt carried forward

- The **update log grows unbounded** (`yUpdate` accumulates) — that's **flaw #4**, harvested in S12 with
  snapshot + compaction (load-time before/after).
- **In-PR arc fixed here:** the provider reconnect gap — updates arriving during the sync handshake were
  dropped; the fix is *sync fully, then attach the live listener* (🔗 Tracer S6 bootstrap-gap race).

*Lesson (the six-course thesis, final form): the framework decision every prior course rehearsed reaches its
apex here — and you can only make this call well because you built the toy version first.*
