# Folio Flaw Ledger (author-private until Sprint 13 recap)

| # | Planted in | What | Where | Harvested in | Status |
|---|-----------|------|-------|--------------|--------|
| 1 | S05 | Naive real-time uses last-write-wins on whole-doc saves — concurrent edits clobber each other | naive sync | S06–S07 (the entire CRDT arc exists to replace this; the ADR quotes it) | planned (announced) |
| 2 | S03 | Block `id`s generated client-side with `Math.random`-ish scheme — collision-prone under offline/concurrent creation | editor block ids | S07 (Yjs-managed ids / proper unique ids; collision test) | planned |
| 3 | S09 | Comment anchors stored as absolute character offsets — any concurrent edit shifts them to the wrong text | comment anchoring | S13 (relative positions; anchor-drift fuzz) — note: S09 itself introduces relative positions for the happy path, S13 hardens edge cases | planned |
| 4 | S10 | Update log grows unbounded — no compaction; document load time degrades with edit count | doc persistence | S12 (snapshot + compaction; load-time before/after) | planned |
| 5 | S11 | ACL checks on document *load* but not on live update messages — a demoted collaborator's in-flight socket keeps editing | ws update authz | S13 (per-message ACL revalidation; revoked-mid-session test) | planned |

**In-PR arcs (planted and fixed inside one PR by design):**
S06 toy-CRDT tombstone bug (deleted-then-concurrently-inserted char resurrects) → fuzzer catches → fix · S07 provider reconnect drops updates during the sync gap → gap test → fix · S08 offline merge duplicates a block → dedupe via CRDT identity · S12 cursor-render storm → batching.

**Rules:** never fix a ledger flaw silently; harvesting commits quote the ledger row and flip Status.
