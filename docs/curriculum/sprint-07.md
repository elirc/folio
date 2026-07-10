# Curriculum Note — Sprint 7: Adopt Yjs + Custom Provider (Flagship)

## Learning objectives
- Adopt a production CRDT (Yjs) **knowingly** — as a peer who built crdt-101, not a cargo-culter.
- Own the transport you depend on: build a **custom provider**, not a black box.
- Feel the capstone's emotional core: **the S05 paragraph that died now survives.**
- Recognize a cross-course pattern (the reconnect/bootstrap gap) and fix it the same way.

## Key concepts
- **Yjs = crdt-101 grown up.** `ySyncPlugin` binds a Y.Doc's XML fragment to ProseMirror, so every editor
  transaction becomes a Yjs update — the *same operations* you built by hand in S06 (identity, causal
  ordering, tombstones), now industrial, fast, and rich-text-capable. Reading Yjs feels like meeting old
  ideas at production scale. That familiarity **is** "adopt knowingly."
- **Build the provider, not import y-websocket.** We write our own provider precisely so the transport isn't
  a black box (the whole curriculum's thesis). The protocol is crdt-101's "merge two replicas" as a wire
  handshake: state-vector → delta → update relay. You send a compact "what I have," get back "only what you
  lack." (See `sync-protocol.md`.)
- **🎯 The S05 test flips GREEN — stop and feel this.** The exact two-client concurrent edit that destroyed a
  paragraph in S05 now converges, keeping both edits. Two sprints of understanding; one flipped assertion.
  Diff the S05 damning test against the S07 convergence test — that diff *is* the whole arc.
- **The reconnect gap.** A live update that lands mid-handshake must be *buffered, not dropped* (sync fully,
  then attach the live listener). 🔗 You should **recognize** this — it's Tracer S6's bootstrap-gap race,
  CRDT-shaped. The same shape, the same fix; cross-course pattern mastery.
- **Awareness is ephemeral — fourth appearance, now reflexive.** Presence and cursors ride Yjs's awareness
  channel and **never** enter the doc update log. 🔗 Durable-vs-ephemeral: a cursor in the durable log would
  replicate + persist every caret twitch to everyone forever — the S04 state-classification mistake at the
  network layer.
- **Convergence, still fuzzed.** We re-aim crdt-101's fuzzer at the *real* transport (Yjs + our protocol):
  trust the library's core, but **prove your integration converges.** The convergence gate now guards both
  the toy and the real system.

## Flaws closed
- **#1 (LWW clobber)** — the real CRDT replaces whole-doc last-write-wins; the damning test is green.
- **#2 (block ids)** — Yjs's `(clientId, clock)` identity is collision-proof; a test shows the old scheme
  could collide and the new cannot. *Identity, not chance* — S06's keystone, cashed.

## Deferred (ledger)
- **#4** — the Yjs update log grows unbounded (`yUpdate` accumulates); snapshot + compaction lands S12.

## The debate, cashed
**Yjs vs Automerge vs keep building crdt-101?** Resolved: **Yjs** — with crdt-101 as the honest baseline
("here's what we'd have to build; here's what Yjs already solved"). *The framework decision every prior
course rehearsed reaches its final form here — and you can only make this call well because you built the
toy first.*

## ⚗️ Lab
Run the convergence fuzzer against the live transport with injected reordering/duplication; confirm
convergence holds. Then run the same op sequence through crdt-101 and Yjs and compare. Finally: open a doc
in two windows and edit together — watch both survive, cursors track. Compare the *feeling* to S05.

## Exercise questions
1. Trace one keystroke from your keyboard to the other window: PM transaction → Yjs update → `update`
   message → server merge → relay → peer apply → peer PM. Where is the crdt-101 idea in each hop?
2. Why does the reconnect fix buffer gap updates instead of just re-syncing? (Hint: what property makes
   apply-order not matter?)
3. Why is a cursor awareness state and not document state? What breaks if you put it in the Y.Doc?
4. Open the S05 `naiveSync.test.ts` and the S07 convergence test side by side. Which assertion inverted, and
   what two sprints of work justify the inversion?

## Further reading
- Yjs docs + the YATA paper · `y-prosemirror` · Kevin Jahns' talks on Yjs internals · CRDT vs OT (final
  orientation) · ADR-0008 (this decision) · `sync-protocol.md`
