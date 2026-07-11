# Folio — Course Retrospective (the capstone, revealed)

Folio is the **capstone** of a six-course upskilling curriculum: a real-time collaborative editor that
survives a network partition. This document reveals the design behind the course — the planted flaws, the
central thesis, and what the learner became.

## The thesis: earn convergence three times

The spine of Folio — and of the whole curriculum — is **"build it once badly to understand it, then adopt the
real thing knowingly."** We earned convergence three times:

1. **S05 — naive last-write-wins (broken on purpose).** Whole-document broadcast; two people editing lose
   one's work. A *damning test* asserts the data loss. You had to *feel* the problem.
2. **S06 — crdt-101, a sequence CRDT built by hand.** Identity-not-position, tombstones, logical clocks, and
   a convergence fuzzer. Frozen after this sprint — its value was never the code, it was the understanding.
3. **S07 — adopt Yjs, knowingly.** The custom provider, the migration, the flipped damning test. We read Yjs
   as *peers who built the toy*, not cargo-culters — and every later sprint (anchors, compaction, security,
   split-brain confidence) was possible *because* of S06.

*The framework you adopt without first building a toy version is a liability; the one you adopt after is a
tool.* The split-brain drill (S15) is that thesis made physical: the scenario that destroys naive systems is
a non-event, because you understood the hard problem and chose the right tool with your eyes open.

## The flaw ledger — all five, planted and harvested

| # | The flaw | Planted | Harvested | The lesson |
|---|----------|---------|-----------|------------|
| 1 | Whole-doc last-write-wins clobbers concurrent edits | S05 (announced) | S06 toy CRDT → S07 Yjs | Positional sync can't merge; you need identity + a real CRDT |
| 2 | Client-random block ids collide under concurrency | S03 (silent) | S07 (Yjs `(clientId,clock)`) | Identity, not chance — the right model deletes the failure mode |
| 3 | Comment anchors as absolute offsets drift | S09 (seed) | S09 relative positions → S13 fuzzy fallback | Positions must be relative to survive edits; deleted anchors need a fallback |
| 4 | Update log grows unbounded; load degrades | S10 | S10 compaction → S12 budget gate | Append-only logs need compaction; tie cadence to the load-time budget |
| 5 | ACL checked at load, not on live update messages | S11 (silent) | S13 per-message revalidation | **Every transport that outlives a request must re-authorize** |

Flaw #5 is the deepest, and it appeared in three courses (Tracer channels, Relay webhooks, Folio updates) —
the cross-course security thesis: *a socket doesn't know your permissions changed, so you must re-check every
message.*

## The recurring lessons (every course rehearsed these)
- **Identity resolution** (crdt-101's keystone; block ids; anchors).
- **The durable/ephemeral split** (collapse=document vs cursor=awareness; four appearances).
- **Authz per transport, not per request** (flaw #5).
- **The framework-adoption thesis** (build-then-adopt: XState, Temporal, ClickHouse, vector DBs, Yjs).
- **Audit-first hardening** and the **flaw-ledger method** itself.
- **Projections / read-write-path split** (search, history-is-the-log, compaction).
- **Systems that handle failure deploy for free** (reconnect → offline → drain).

## What the learner became
The learner who started by *reading* Meridian's PRs now *ships* a split-brain-surviving collaborative editor,
explains and debugs every layer, and can review anyone's code. Observer → author → peer. That was the point.

## The convergence gate — sacred to the end
From S06 the convergence fuzzer is a permanent CI gate; S07 added the Yjs transport, S08 partitions, S13
transport chaos, S15 the split-brain drill. The crown property is pinned in CI forever. See
`docs/curriculum/RETROSPECTIVE.md` for the six-course view.

**v1.0.0 — the network split the servers, both sides kept editing, and the document healed itself.**
