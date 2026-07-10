# Sprint 11 — Permissions v2: ACL Inheritance & Sharing

**Branch:** `sprint-11/permissions-sharing` · **Size:** M/L · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** Real permissions on the document tree: ACL inheritance down the tree with overrides, share links (public/permissioned), and the wiring of permissions into the *live sync layer* — where a planted flaw (checking ACL only at load, not on updates) sets up S13's scariest security lesson.

## A — Issues
1. `ACL inheritance: permissions flow down the tree, with per-node overrides`
2. `Effective-permission resolution (walk ancestors, apply overrides) + caching`
3. `Share links: public view, permissioned (role) links, expiry`
4. `Permission enforcement in the editor + sync (load-time; live-update gap planted)`

## B — Commits
| # | Commit | Notes |
|---|--------|------|
| 1 | `[L] feat(api): effective-permission resolver — walk ancestors, apply overrides, cache per (user,node)` | 🔗 tree traversal from S2; the resolver is the ACL spine |
| 2 | `[L] feat(api): permission overrides — a subtree can grant/restrict beyond its parent` | the classic "this folder is team-wide but this doc is private" case |
| 3 | `[L] feat(api): share links — public read, permissioned role links, expiry + revocation` | 🔗 Pulse S10 share-token lessons (expiry/revocation learned) — the learner doesn't re-plant that flaw |
| 4 | `[L] feat(editor): enforce permissions — viewers can't edit, commenters can only comment (UI + load-time API check)` | **[flaw #5]** ACL checked at document *load*, but live Yjs update messages aren't re-authorized — a demoted user's open socket keeps editing (harvest S13) |
| 5 | `[L] feat(web): sharing UI — invite, role picker, link management, effective-access viewer` | "why can this person edit?" — an effective-permission explainer (🔗 the debuggability instinct from Harbor/Relay) |
| 6 | `[L] test(api): inheritance + override resolution matrix; share-link access; load-time enforcement` | the live-update gap is NOT tested here — that absence is the plant |
| 7 | `[A] docs: ADR-0011 ACL inheritance model; curriculum note` | |

## C — Review order
The resolver (1) → overrides (2) → enforcement (4, note it's load-time only) → the effective-access explainer (5).

## D — Teaching comments (~9)
- inheritance resolution — 📘 effective permission = walk from node to root, apply the nearest override; caching per (user, node) with invalidation on ACL change or tree move — the cache-invalidation-on-move edge case is subtle
- overrides both ways — 📘 a subtree can be *more* or *less* permissive than its parent; modeling grant-and-restrict (not just grant) is what real ACLs need
- share-link maturity — 🔗 review-lens: the learner adds expiry + revocation *without being told* — Pulse S10's flaw #5 taught them; watch the git history show a lesson that stuck
- load-time-only enforcement — *(the flaw: the AI review of commit 4 praises the load check but doesn't mention live updates — a real reviewer's blind spot, and S13's probe will find it; the absence in commit 6's tests is the tell)*
- effective-access explainer — 📘 permissions must be debuggable: "this person can edit because they inherit editor from the parent folder"; opaque ACLs generate support tickets (🔗 Relay/Harbor's explainability theme)
- cache invalidation on move — ⚠️ moving a node changes everyone's effective permissions below it; the permission cache must bust on tree moves — a place bugs hide

## E — Debate
**"ACL model: role-based inheritance vs per-resource grants vs capability tokens?"** Per-resource: precise, unmanageable at scale. Capabilities: elegant, hard to audit ("who can see this?"). Role-based inheritance: matches how users think about folders, auditable. **Resolution:** role-based inheritance with overrides; share links are scoped capability tokens layered on top. Lesson: *model permissions the way users model them (folders inherit), and make "who can access this and why" a queryable answer.*

## F/G — Close
- Squash: `feat(sprint-11): ACL inheritance, sharing (closes #…)`
- Deferred: per-block permissions, guest external sharing, audit log of access.
- Ledger: flaw #5 recorded (live-update authz gap).
- Recap idea: *permissions on a tree are inheritance plus overrides plus a cache that busts on moves — and enforcing them at load is only half the job* (S13 finds the other half).
