# Sprint 13 — Hardening: Convergence Chaos & Security

**Branch:** `sprint-13/hardening` · **Size:** L · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** Audit-first sweep with the sync engine and CRDT as the attack surface: convergence under transport chaos, malformed/malicious update rejection, the live-update authorization gap (the scary one), and comment-anchor edge cases. **The learner runs the audit and drafts findings** — near-peer by now.

## A — Setup (audit before code)
Learner runs: the convergence fuzzer under a transport-chaos harness (drop/dup/reorder/delay/corrupt updates), a malformed-update injection probe, a live-update authz probe (edit with a socket after being demoted), the anchor-drift fuzzer (delete anchored content, cross-block ranges), plus dependency/gitleaks. Findings → `docs/audits/sprint-13-audit.md` (commit 1, learner-drafted, AI-annotated).

## B — Commits (one finding per commit)
| # | Commit | Notes |
|---|--------|------|
| 1 | `[L] docs: sprint-13 audit — P1..P4 with evidence` | |
| 2 | `[L] test(fuzz): convergence under transport chaos — drop/dup/reorder/delay as permanent CI (P1)` | Yjs is robust to dup/reorder by design; the test *proves* it for our transport and catches any provider bug that breaks the guarantee |
| 3 | `[A] security(sync): malformed-update rejection (P1) — validate update structure, reject/quarantine garbage before applying` | a corrupt or hostile update must not crash the doc or the server; size caps, structural validation; AI writes this (deep Yjs-internals territory) |
| 4 | `[L] fix(sync): per-message ACL revalidation (P1)` | **harvests flaw #5**, ledger quoted: the probe demonstrates a user demoted to viewer whose open socket keeps sending edits that get applied; fix re-checks permission on *every* update message, not just at load; revoked-mid-session test |
| 5 | `[L] fix(editor): anchor edge cases (P2)` | **harvests flaw #3 (part 2)**: anchored text fully deleted → fuzzy-match fallback + "comment orphaned" state; cross-block ranges handled; the anchor-drift fuzzer goes green |
| 6 | `[A] security(sync): update authorship verification (P2) — an update claims a client id; verify the sender is who they claim` | spoofed-authorship attempts (edit as someone else); bind updates to the authenticated session |
| 7 | `[L] security(api): share-link hardening — enumeration resistance, scope confinement (P2)` | share links can't be widened by guessing; a view link can't be escalated to edit |
| 8 | `[L] security(ci): gitleaks + dependency gates (P3, fast-forward)` | |
| 9 | `[A] docs: threat model — the collaborative-sync attack surface (convergence, authz-on-the-wire, spoofing, anchor abuse); curriculum note` | |

## C — Review order
Audit doc → **the live-update authz gap (4): edit-after-demote** → convergence chaos (2) → anchor edge cases (5) → authorship verification (6).

## D — Teaching comments (~10)
- convergence under chaos — 🔗 the learner's own fuzzer, now under a chaos harness (drop/dup/reorder/delay/corrupt); Yjs guarantees convergence under reordering/duplication *by design* — the test proves our *transport* preserves that guarantee (a provider bug could still break it); every course pins its crown property in CI, and here it's convergence
- **live-update authz gap** — ⚠️ the scariest lesson: authorizing at *load* is not authorizing the *stream*; a WebSocket outlives a permission change, so a demoted user's socket keeps writing unless every message is re-checked; 🔗 flaw #5, planted S11 — the exact "authz per transport, not just per request" lesson as Tracer S13 (channel authz) and Relay S13 (webhook auth), now update-message-shaped
- malformed-update rejection — ⚠️ updates are binary blobs from clients; a malformed one can crash the apply; validate structure + cap size + quarantine — untrusted input discipline, CRDT-shaped
- authorship spoofing — 📘 a Yjs update carries a client id, which the client sets; binding it to the authenticated session prevents "edit as your boss"; identity on the wire must be server-verified
- anchor edge cases — 🔗 flaw #3 fully closed: relative positions (S9) handle edits; *deletion* of anchored content needs a fallback (fuzzy match or orphaned state); the fuzzer found the cases the happy path missed
- learner-run audit — 📘 the capstone's near-peer moment: the learner drives the whole audit; the AI annotates and writes only the deepest fixes — the intended end state of the entire six-course curriculum

## E — Debate
**"Live-update authz: re-check every message vs short-lived capability tokens vs re-handshake on ACL change?"** Every-message: correct, per-message cost. Tokens: efficient, but revocation lag (the token outlives the demotion). Re-handshake on change: efficient + prompt, but needs a reliable ACL-change→disconnect signal. **Resolution:** cheap per-message check (cached effective-permission with prompt invalidation on ACL change) + forced re-handshake on demotion. Lesson: *every transport that outlives a request must re-authorize — and "outlives a request" describes every real-time connection you'll ever build* (the cross-course security thesis, stated at the capstone).

## F/G — Close
- Squash: `fix(sprint-13): convergence chaos, live authz, anchor hardening (closes #…)`
- **Recap reveals the full flaw ledger** (Folio edition) — the live-update authz gap as the centerpiece, tied back to Tracer/Relay's identical-shaped lessons.
- **Lab:** the learner attacks their own system — demote-and-keep-editing, spoof authorship, feed malformed updates, orphan comments — and confirms each defense; files anything that slips.
- Ledger: flaws #3, #5 closed — fully harvested.
- Recap idea: *the same security lesson has now appeared in three courses — real-time connections must re-authorize every message, because a socket doesn't know your permissions changed.*
