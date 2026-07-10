# Curriculum Note — Sprint 13: Hardening (Convergence Chaos & Security)

## Learning objectives
- Run a security audit of a **stream-shaped** system yourself (the near-peer moment).
- Internalize the capstone security thesis: **every transport that outlives a request must re-authorize.**
- Close the last two planted flaws (#3 anchors, #5 live-update authz) with permanent tests.

## Key concepts
- **Audit-first, learner-driven.** You run the probes (chaos fuzz, malformed injection, edit-after-demote,
  anchor-drift) and draft the findings (`docs/audits/sprint-13-audit.md`); the AI annotates and writes only
  the deepest fixes. This is the intended *end state* of the whole six-course curriculum — you're a near-peer.
- **⚠️ The scariest lesson: authorizing at load ≠ authorizing the stream (flaw #5).** A WebSocket outlives the
  permission that admitted it, so a user demoted mid-session keeps an editing socket unless **every mutating
  message** is re-checked. 🔗 The exact "authz per transport, not per request" lesson from Tracer (channels)
  and Relay (webhooks) — three courses, same shape, now update-message-shaped. **This is the one to keep.**
- **Untrusted updates are hot-path input.** A Yjs update is a binary blob from a client. `safeApplyUpdate`
  caps size and validates structure on a scratch doc before mutating live state; the relay is quarantined.
  Validate before you touch shared state.
- **Identity on the wire is server-verified.** A Yjs update's client id is client-set; verify it against the
  authenticated session, or a client can "edit as your boss."
- **Convergence is a property you PIN under chaos.** The sacred fuzzer now runs under drop/dup/reorder/delay —
  proving OUR transport preserves Yjs's guarantee (a provider bug could still break it). Every course pins its
  crown property in CI; here it's convergence.
- **Anchors, fully closed (flaw #3).** Relative positions handle edits; *deletion* of anchored text needs a
  fuzzy fallback + orphaned state. The fuzzer found the cases the happy path missed.

## Ledger — ALL FIVE FLAWS CLOSED
#1 LWW (S06–S07 CRDT arc) · #2 block ids (S07) · #4 unbounded log (S10+S12) · #3 anchors (S09+S13) · #5
live-update authz (S13). The recap reveals the full ledger; the deepest one — #5 — ties back to Tracer and
Relay's identically-shaped lessons.

## The debate, cashed
**Live-update authz: re-check every message vs capability tokens vs re-handshake on ACL change?** Resolved:
cheap per-message check + forced re-handshake on demotion. *Every transport that outlives a request must
re-authorize — and that describes every real-time connection you'll ever build.*

## ⚗️ Lab
Attack your own system: demote-and-keep-editing, spoof authorship, feed malformed updates, orphan a comment.
Confirm each defense; file anything that slips.

## Exercise questions
1. Why is authorizing at connect insufficient for a WebSocket? Name the exact message where a correct server
   rejects a demoted user's edit.
2. This lesson appeared in three courses. State it in one sentence that's true for channels, webhooks, AND
   Yjs updates.
3. Why validate a malformed update on a scratch doc rather than in a try/catch around the live apply? (Both
   work — what does the scratch-doc approach buy you?)
4. Trace the anchor fallback: anchored → fuzzy → orphaned. What can fuzzy match get *wrong*, and why is
   orphaned better than guessing?

## Further reading
- "Authorization at the edge vs per-request" · Yjs update encoding/decoding · OWASP WebSocket security ·
  `threat-model.md`, ADR-0014
