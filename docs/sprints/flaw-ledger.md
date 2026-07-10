# Folio Flaw Ledger (author-private until Sprint 13 recap)

| # | Planted in | What | Where | Harvested in | Status |
|---|-----------|------|-------|--------------|--------|
| 1 | S05 | Naive real-time uses last-write-wins on whole-doc saves — concurrent edits clobber each other | naive sync | S06–S07 (the entire CRDT arc exists to replace this; the ADR quotes it) | planned (announced) |
| 2 | S03 | Block `id`s generated client-side with `Math.random`-ish scheme — collision-prone under offline/concurrent creation | editor block ids | S07 (Yjs-managed ids / proper unique ids; collision test) | planned |
| 3 | S09 | Comment anchors stored as absolute character offsets — any concurrent edit shifts them to the wrong text | comment anchoring | S09 relative positions (happy path) → S13 fuzzy fallback + orphaned state (anchor-drift fuzzer) | CLOSED (S09 primary + S13 edge cases) |
| 4 | S10 | Update log grows unbounded — no compaction; document load time degrades with edit count | doc persistence | S10 mechanism (compaction: snapshot + Y.mergeUpdates; compacted≡replayed property) → S12 continuous load-time budget gate | HARVESTED (mechanism S10; budget-enforced S12) |
| 5 | S11 | ACL checks on document *load* but not on live update messages — a demoted collaborator's in-flight socket keeps editing | ws update authz | S13 (per-message ACL revalidation in yroom.handle; setCanEdit on demotion; revoked-mid-session test in yroom.test.ts) | CLOSED (S13) |

**ALL 5 FLAWS HARVESTED as of S13.** #1 LWW (S06–S07 CRDT arc) · #2 block ids (S07 Yjs identity) · #4 unbounded log (S10 compaction + S12 budget gate) · #3 anchors (S09 relative + S13 fuzzy fallback) · #5 live-update authz (S13 per-message revalidation). The full ledger is revealed in the S13 recap / S15 course retrospective.

**In-PR arcs (planted and fixed inside one PR by design):**
S06 toy-CRDT tombstone bug (deleted-then-concurrently-inserted char resurrects) → fuzzer catches → fix · S07 provider reconnect drops updates during the sync gap → gap test → fix · S08 offline merge duplicates a block → dedupe via CRDT identity · S12 cursor-render storm → batching.

**Rules:** never fix a ledger flaw silently; harvesting commits quote the ledger row and flip Status.
