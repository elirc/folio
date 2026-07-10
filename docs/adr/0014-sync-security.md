# ADR-0014 — Sync-layer security: authz on the wire, untrusted updates, anchor hardening

**Status:** accepted (S13) · **Closes:** flaw #3 (anchors) and flaw #5 (live-update authz) · **See:** `threat-model.md`

## Context

The collaborative-sync layer is a stream of untrusted binary updates over long-lived sockets. Request-shaped
security intuition doesn't fit. S13 audits it (see `docs/audits/sprint-13-audit.md`) and fixes the P1/P2
findings, each with a permanent test.

## Decisions

### 1. Per-message authorization (harvest of flaw #5)
Editing capability is re-checked on **every mutating message**, not just at connect. A demotion updates the
socket's capability (`YRooms.setCanEdit`), so the next `update`/`sync2` from a demoted user is dropped;
`sync1` (a read) stays allowed. **A WebSocket outlives the permission that admitted it** — so authorization
must follow the permission change onto the wire.

**The debate — re-check every message vs capability tokens vs re-handshake on change:**
- Every-message: correct, small per-message cost.
- Tokens: efficient, but revocation lag — the token outlives the demotion.
- Re-handshake on change: efficient + prompt, but needs a reliable ACL-change→signal.

**Resolved:** cheap per-message check (cached effective role with prompt invalidation on ACL change) + a
forced re-handshake on demotion. *Lesson: every transport that outlives a request must re-authorize — and
"outlives a request" describes every real-time connection you'll ever build.* 🔗 The same lesson as Tracer
(channel authz) and Relay (webhook auth), now update-message-shaped — the cross-course security thesis.

### 2. Untrusted-update discipline
`safeApplyUpdate` caps size (cheap DoS guard) and structurally validates on a scratch doc before mutating
live state; the server relay is try/catch-quarantined. A corrupt or hostile blob can't crash the doc or the
server. *Untrusted input on the hottest path gets validated before it touches shared state.*

### 3. Authorship verification
A Yjs update's client id is set by the sender. `verifyUpdateAuthorship` requires every authored struct's
client id to equal the socket's authenticated id — preventing "edit as your boss." **Identity on the wire is
server-verified, never trusted from the payload.**

### 4. Anchor hardening (harvest of flaw #3)
Relative positions (S09) handle edits around an anchor; the planted edge was the anchored text being deleted.
`resolveAnchorWithFallback` layers: anchored → **fuzzy-match** → **orphaned** (detached, not lost). The
anchor-drift fuzzer proves it never crashes and always classifies. 🔗 Exactly the S09 debate's resolution:
relative positions primary, fuzzy fallback for the one case they can't handle.

### 5. Convergence under chaos (permanent CI)
The sacred fuzzer under drop/dup/reorder/delay — proving OUR transport preserves Yjs's convergence
guarantee (a provider bug could still break it). Pinned in the convergence gate forever.

## Consequences

- Flaws #3 and #5 fully harvested; the full flaw ledger (#1–#5) is now closed and revealed in the sprint
  recap.
- Deferred: per-socket rate limiting, access audit log, E2E content encryption.

*Lesson (capstone security thesis): real-time connections must re-authorize every message, because a socket
doesn't know your permissions changed.*
