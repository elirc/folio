# Sprint 13 Audit — Convergence Chaos & Security (learner-drafted, AI-annotated)

**Method: audit before code.** The learner ran the probes; findings are ranked P1 (fix now) → P3
(fast-forward). This is the capstone's near-peer moment — the learner drives the audit.

## P1 — must fix this sprint

### P1.1 — ⚠️ Live-update authorization gap (flaw #5)
**Probe:** connect as an editor, get demoted to viewer in another session, keep typing.
**Evidence:** the demoted user's open socket keeps sending `update` messages that the server applies — the
ACL was checked only at connect. A WebSocket outlives the permission that admitted it.
**Fix (commit):** per-message ACL revalidation — every mutating message re-checks the socket's current edit
capability; a demotion updates it. `yroom.test.ts` proves demote-mid-session drops the next edit.

### P1.2 — Malformed-update crash / DoS
**Probe:** feed the sync endpoint garbage bytes and an oversize blob.
**Evidence:** an unvalidated update can throw inside `applyUpdate`, and a huge blob wastes memory before
parsing.
**Fix:** `safeApplyUpdate` — size cap + structural validation on a scratch doc before touching live state;
server relay try/catch-quarantined.

### P1.3 — Convergence under transport chaos
**Probe:** the convergence fuzzer under drop/dup/reorder/delay.
**Evidence:** Yjs converges by design, but a *provider* bug could break it; we had no test proving OUR
transport preserves the guarantee.
**Fix:** `chaos.convergence.test.ts` — property test under chaos, permanent CI (in the convergence gate).

## P2 — fix this sprint

### P2.1 — Authorship spoofing (edit as another user)
**Probe:** send an update whose client id is someone else's.
**Evidence:** a Yjs update's client id is set by the sender; nothing verified it.
**Fix:** `verifyUpdateAuthorship` — authored client ids must match the socket's authenticated id.

### P2.2 — Anchor edge cases (flaw #3, part 2)
**Probe:** the anchor-drift fuzzer — delete anchored text entirely; cross-block ranges.
**Evidence:** relative positions handle edits *around* an anchor but not *deletion* of the anchored text —
the comment mis-anchored or vanished.
**Fix:** `resolveAnchorWithFallback` — anchored → fuzzy-match → orphaned; `anchor-drift.test.ts` fuzzer green.

### P2.3 — Share-link scope
**Probe:** try to widen a view link to edit; guess tokens.
**Evidence:** tokens are cuid (unguessable) and links resolve to exactly their role — confirmed confined.

## P3 — fast-forward
- Secret-scan + dependency audit CI step.

## Sign-off
All P1/P2 findings fixed with permanent tests; flaws #3 and #5 fully harvested. Residuals (per-socket rate
limiting, access audit log) deferred and recorded in `threat-model.md`.
