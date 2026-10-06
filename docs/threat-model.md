# Folio Threat Model — the Collaborative-Sync Attack Surface (S13)

A real-time collaborative editor has an unusual attack surface: **long-lived WebSocket connections carrying
untrusted binary updates that mutate shared state.** Most web-security intuition is request-shaped ("check
auth per request"); this system is *stream*-shaped, and that difference is where the bugs live.

## Assets
- Document content (the Y.Doc / update log) and its history.
- Per-user access (roles, share links).
- Presence/identity (who is editing as whom).

## Trust boundaries
- **The WebSocket message.** Every update is a binary blob chosen by a client. Untrusted input on the
  hottest path.
- **The share link.** A bearer token that grants access to a holder.
- **The client id in a Yjs update.** Set by the client — not to be trusted as identity.

## Threats & mitigations

| # | Threat | Mitigation (S13) |
|---|--------|------------------|
| T1 | **Convergence break under a hostile/flaky transport** (drop/dup/reorder/delay) | Yjs converges by design under dup/reorder; the **chaos convergence fuzzer** proves OUR transport preserves it, as permanent CI. |
| T2 | **Malformed/malicious update crashes the doc or server** | `safeApplyUpdate`: size cap + structural validation on a scratch doc before touching live state; the server relay is try/catch-quarantined. |
| T3 | **⚠️ Edit-after-demote (live-update authz gap, flaw #5)** | **Per-message ACL revalidation.** Editing capability is re-checked on EVERY mutating message, not just at connect; a demotion updates the socket's capability so its next edit is dropped. |
| T4 | **Authorship spoofing ("edit as your boss")** | `verifyUpdateAuthorship`: every authored struct's client id must match the socket's authenticated client id; identity on the wire is server-verified, never trusted from the payload. |
| T5 | **Share-link abuse** (enumeration, scope escalation) | Unguessable tokens (cuid); a link resolves to *exactly* its granted role (never escalated); expiry + revocation mandatory. |
| T6 | **Anchor abuse / comment orphaning** (flaw #3) | Relative positions + fuzzy fallback + orphaned state — a deleted-anchor comment degrades gracefully, never crashes or silently mis-anchors. |
| T7 | Secrets in the repo / vulnerable deps | Secret-scan + dependency audit CI step. |

## The central lesson (the cross-course security thesis)

**Every transport that outlives a request must re-authorize — and "outlives a request" describes every
real-time connection you will ever build.** Authorizing at *connect* is authorizing a *snapshot*; a
WebSocket, a subscription, a long-poll, a streamed response all outlive the permission that admitted them.
This exact lesson appeared in three courses now — Tracer (channel authz), Relay (webhook auth), and Folio
(update-message authz) — each time update-shaped for its domain. If you learn one security reflex from the
capstone, learn this: **authorize the action, not the session that preceded it.**

## Residual / deferred

> **Status note (2026-10-06, verified against `main` @ `af51546`):** some S13 mitigations above exist as
> tested helpers but are not yet on the live server path. `safeApplyUpdate` and `verifyUpdateAuthorship`
> (`packages/collab/src/security.ts`) are called only from `security.test.ts`; the server relay's protection
> against malformed updates is the `try/catch` in `YRooms.handle` (`apps/api/src/yroom.ts`). The per-message
> edit check (T3) is live, but `rooms.setCanEdit` is called only from `yroom.test.ts` — no ACL route pushes a
> demotion to open sockets — and `apps/api/src/ws.ts` grants edit when the `member` query param is absent.
> Treat T2 (size cap), T3 (demotion propagation), and T4 as open wiring work.

- Rate-limiting per socket (DoS beyond size caps).
- Audit log of access decisions.
- End-to-end encryption of document content (out of scope; the server is trusted with plaintext).
