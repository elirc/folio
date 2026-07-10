# Curriculum Note — Sprint 8: Offline-First & Merge (Dialogue)

**Format:** the learner authors the offline layer (`[L/J]`); the AI reviews (`[S]`). You've built
offline-first before (Tracer S7) — this is that muscle, plus a CRDT underneath.

## Learning objectives
- Boot from disk before the network; edit offline; reconnect and converge with **no lost work**.
- Recognize that on a proper CRDT, **merge is free** — so post-merge bugs live *outside* the CRDT.
- Use the tool you adopted: reconnect with the SV diff, not a full resend.
- Build offline UX that **surfaces** changes rather than asking users to **resolve** them.

## Key concepts
- **Boot from disk, THEN network.** IndexedDB loads the Y.Doc first; the editor is instant and editable with
  no connection. 🔗 Tracer S7 ordering — never block editing on a socket. The AI review checks exactly this
  ordering, and it's right because you learned it.
- **Use the tool you adopted (full-resend → diff).** The naive reconnect resends the whole local state; the
  reviewed fix sends only the delta the peer lacks (the S07 SV exchange). 📘 A recurring capstone review
  note: re-deriving a full-resend re-invents a problem Yjs already solved. `offline.test` shows the diff is
  strictly smaller when the peer is nearly caught up.
- **⚠️ The duplicate-block lesson (the subtle one).** A proper CRDT makes merge conflicts impossible *within
  the model*. So when you see a duplicate after merge, **the bug is in logic outside the CRDT** — app-side
  block identity + hand-rolled dedupe. The fix isn't more dedupe; it's pushing identity *into* Yjs (S07's
  harvest). Then two offline creations are two distinct blocks (both survive), and two edits to one block
  converge to one block. Nothing to dedupe. 🔗 This is *why* S07 moved ids into the CRDT.
- **Conflict-free by construction → no conflict dialog.** There are no conflicts to resolve; the CRDT already
  merged. We show status + a "merged while away" summary (a view), never a git-style resolve UI. Bolting a
  conflict resolver onto a conflict-free system is theater.
- **The fuzzer models partitions now.** S06's convergence property extends to offline periods: partition
  replicas, edit independently, heal in any order → converge. Still sacred, still a CI gate.

## The debate, cashed
**Offline UX: merge review vs silent convergence?** Resolved: silent convergence + a non-blocking "changes
merged while you were offline" summary. *Don't bolt a conflict-resolution UI onto a conflict-free system —
surface what changed, don't ask users to resolve what already merged.*

## Learner retro (write your own)
You've now built offline-first twice (Tracer, Folio). What was *the same* (boot-from-disk, queue, reconnect)
and what was *different* (the merge is free here)? Where did the duplicate come from, and why was "add
dedupe" the wrong instinct? Write it down — that contrast is the sprint's real deliverable.

## Exercise questions
1. Why boot from IndexedDB before connecting? Give a concrete user experience that the reverse ordering ruins.
2. The naive reconnect resends everything. Construct the case where that's O(document) wasted bytes per blip,
   and show how the SV diff fixes it.
3. Two offline clients create a block. Explain precisely why the CRDT gives two distinct blocks, and why
   app-side dedupe would corrupt this. What single S07 decision makes it correct?
4. Why is there no merge-conflict dialog? What would one even *say*?

## Further reading
- y-indexeddb · "Local-first software" (Ink & Switch) · CRDT vs git merge (why documents chose CRDTs) ·
  ADR-0009 (this decision)
