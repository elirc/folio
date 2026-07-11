# Changelog

All notable changes to Folio. The capstone of a six-course upskilling curriculum.

## [1.0.0] — Production readiness (S15)

The complete, operable, partition-surviving collaborative editor.

### Phase 3 — Operate (S13–S15)
- **S15** — Sync observability (latency/rate/convergence-health), graceful stateful deploy (drain), backup/
  restore (append-forward), and the **split-brain drill** (partition → both edit → heal → converge). Six-
  course retrospective. **v1.0.0.**
- **S14** — Cross-doc search (permission-scoped CRDT projection), Markdown/HTML export (lossiness documented),
  collaborative-edit a11y announcer + DOM-less a11y gate.
- **S13** — Hardening: convergence-under-chaos fuzzer, malformed-update rejection + authorship verification,
  per-message ACL revalidation (**flaw #5 closed**), anchor fuzzy-fallback (**flaw #3 closed**). All 5 flaws
  harvested.

### Phase 2 — Converge (S06–S12)
- **S12** — Performance: virtualization, batching, the perf:budget CI gate (keystroke O(edit) at scale).
- **S11** — ACL inheritance + sharing (the S02 seam cashed); flaw #5 planted.
- **S10** — Persistence, snapshots, version history; compaction (**flaw #4** mechanism).
- **S09** — Presence, anchored comments (relative positions), suggestion mode; flaw #3 seeded.
- **S08** — Offline-first: IndexedDB, SV-diff reconnect, the duplicate-block lesson.
- **S07** — **Adopt Yjs** + custom provider; the S05 damning test flips green (**flaws #1, #2 closed**).
- **S06** — **crdt-101**: a sequence CRDT from scratch + convergence fuzzer.

### Phase 1 — MVP (S01–S05)
- **S05** — Naive real-time (LWW, deliberately broken); **flaw #1** announced. **v0.5.0.**
- **S04** — Editor depth: nesting, media, keyboard, collapse-as-document-state.
- **S03** — ProseMirror block editor; **flaw #2** planted.
- **S02** — Workspace tree + ACL v1 (the inheritance seam).
- **S01** — Foundation: doc skeleton + WS echo.

## [0.5.0] — MVP (S05)
Single-user block editor + naive real-time (last-write-wins). Half the product; the hard half — convergence —
followed in S06–S07.
