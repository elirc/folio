# ADR-0016 — Observability & operating a stateful sync layer

**Status:** accepted (S15) · **The finale.** Operating what the previous 14 sprints built.

## Context

Folio is a *stateful* system: the server holds live document state and open sockets. Operating it — observing
health, deploying without dropping edits, backing up and restoring, and surviving a network partition — is
the graduation exercise.

## Decisions

### 1. Monitor the invariants the architecture promises
Metrics: sync-lag + document-load latency histograms, per-doc active connections, update rate — and, unique
to a CRDT, **convergence health**. 📘 A CRDT promises convergence, so we monitor *divergence*. Because
divergence should be *impossible*, a diverged verdict is a high-signal "real bug" page, not routine noise. We
distinguish `suspect` (state vectors differ — normal mid-propagation) from `diverged` (a full bidirectional
exchange still leaves them different — a genuine violation). The `DivergenceAlerter` fires once per incident.

### 2. Graceful stateful deploy = drain via reconnect
`YRooms.drain()` persists every active doc's final state, then evicts sockets with a "draining" close code so
clients reconnect to the new instance. ⚠️ The hardest deploy in the curriculum — live state + open sockets —
and it's survivable **only because of the S07/S08 reconnect machinery**. 🔗 The cross-course law, graduating
here: *a system that survives a dropped connection survives a rolling deploy for free.* Failure-handling and
deploy-handling converge one final time.

### 3. Backup/restore is append, not rewind
A backup is a compacted snapshot + checksum; `restoreDoc` refuses corruption loudly. 🔗 Restoring a
collaborative doc is subtler than restoring a row (Tracer S15's seq-regression, CRDT-shaped): a client whose
live state is *ahead* of the backup must re-sync **forward** (`resyncAfterRestore`), keeping its newer edits,
never rewound to the backup. Restore is append — the S10 lesson, at the ops layer.

### 4. PII-safe telemetry
🔗 Never ship document *content* to error tracking — sync context (doc id, connection state, pending count)
only, scrubbed. The redaction discipline from prior courses.

## The split-brain drill — the capstone's ultimate proof

A network partition splits two instances; both halves accept edits to one document; the network heals. S05's
last-write-wins would silently pick one half and discard the other. The CRDT **converges** — both halves'
edits survive and reconcile. `splitbrain.convergence.test.ts` proves it: the same two-client concurrent edit
that was `.not.toContain` in S05's damning test is `.toContain` here, now at the *infrastructure* level.

**This drill is the entire six-course arc made physical:** understand the hard problem by hand (S06), adopt
the right tool knowingly (S07), and the scenario that destroys naive systems becomes a non-event.

## The final debate — was building crdt-101 (S06) worth a whole sprint?

Skeptic: we threw it away; wasted work. Advocate: without it, every decision in S07–S15 — the custom
provider, the anchor model, compaction, split-brain confidence — would have been cargo-culted; we'd have
adopted Yjs as a magic box, unable to debug, secure, or operate it.

**Resolved: unequivocally worth it** — and this is the six-course thesis: *the framework you adopt without
first building a toy version is a liability; the one you adopt after is a tool.* **Understanding is not
optional infrastructure — it's the thing that lets you adopt, operate, secure, and debug everything else.**

## Consequences
- v1.0.0 ships an operable, observable, partition-surviving collaborative editor.
- The split-brain drill joins the convergence CI gate permanently.
