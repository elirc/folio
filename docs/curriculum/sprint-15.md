# Curriculum Note — Sprint 15: Production Readiness → v1.0.0 (Finale)

## Learning objectives
- Operate a *stateful* collaborative system: observe it, deploy it, back it up, and survive a partition.
- Run the **split-brain drill** — the CRDT's ultimate test, and the whole curriculum's thesis made physical.
- Graduate: from observer (Meridian) to author to peer who ships and operates a hard distributed system.

## Key concepts
- **Monitor the invariant your architecture promises.** A CRDT promises convergence, so we monitor
  *divergence* — and because it should be impossible, an alert is high-signal ("real bug"), never noise. 📘
  Distinguish `suspect` (in-flight propagation) from `diverged` (a genuine violation after a full exchange).
- **⚠️ Stateful deploy = drain via reconnect.** The server holds live document state + open sockets — the
  hardest deploy in the curriculum. It's survivable *only* because of the S07/S08 reconnect machinery: drain
  persists + evicts, clients re-sync on reconnect. 🔗 The cross-course law graduates: **a system that
  survives a dropped connection survives a rolling deploy for free.**
- **🔗 Restore is append, not rewind.** A client ahead of the backup re-syncs *forward*, keeping its newer
  edits — restoring a collaborative doc is subtler than restoring a row (Tracer S15, CRDT-shaped).
- **📘 The split-brain drill — the crowning moment.** Partition two instances, both edit one doc, heal →
  converge with no lost edits. S05's LWW would have discarded a half; the CRDT reconciles both. The same
  concurrent edit that was `.not.toContain` in S05's damning test is `.toContain` here, at the infrastructure
  level. Understand the hard problem (S06), adopt the right tool (S07), and the impossible becomes routine.

## The final debate, cashed
**Was building crdt-101 (S06) worth a whole sprint, given we adopted Yjs anyway?** Resolved: unequivocally.
*The framework you adopt without first building a toy version is a liability; the one you adopt after is a
tool. Understanding is not optional infrastructure — it's what lets you adopt, operate, secure, and debug
everything else.*

## 🎓 What you can do now
You built a real-time collaborative editor that survives a network partition — and you can explain, debug,
secure, and operate every layer of it, because you built the CRDT by hand before adopting Yjs. You went from
*reading* PRs to *shipping* a split-brain-surviving system and reviewing anyone's code. That transition —
observer → author → peer — was the point all along. See `COURSE-RETROSPECTIVE.md` and the six-course
`RETROSPECTIVE.md`.

## Exercise questions
1. Why is a *divergence* alert high-signal in a CRDT system, when the same alert would be routine in an
   eventually-consistent KV store?
2. Trace a rolling deploy: instance A drains while B is live. What exactly does a connected client experience,
   and which S07/S08 machinery makes it seamless?
3. Restore a doc from a 5-minute-old backup while a client has newer edits. Why append-forward, not rewind?
4. Run the split-brain drill in your head with S05's LWW instead of the CRDT. Whose edits vanish, and why?

## Further reading
- "Operating stateful services" · RAIL/SLO practice · Jepsen (partition testing) · ADR-0016, the runbooks,
  and the split-brain postmortem.
