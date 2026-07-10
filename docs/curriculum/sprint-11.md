# Curriculum Note — Sprint 11: Permissions v2 (ACL Inheritance & Sharing)

## Learning objectives
- Cash the S02 seam: turn "role per node" into full **tree inheritance with overrides** — a *local* change.
- Model overrides **both ways** (grant AND restrict), the way real ACLs and real users work.
- Make permissions **debuggable** ("why can this person edit?").
- Ship share links with expiry + revocation from the start (a lesson that stuck).

## Key concepts
- **Inheritance = nearest grant wins.** Effective role = walk node→root, take the first grant found; else the
  workspace default. 🔗 The S02 seam paying off: `resolveNodeRole(ws, grant)` is just the depth-1 case of
  `resolveEffectiveRole(ws, [grants…])`, and the `/access` route contract didn't move. **That's the whole
  point of a good seam** — the deep future change stayed local to the resolver.
- **Overrides both ways.** A subtree can be *more* permissive than its parent ("team folder, but this doc is
  editable by all") or *less* ("editable workspace, but this folder is locked"). We take the nearest grant
  verbatim, never `max()` — grant-AND-restrict is what real ACLs need.
- **Permissions must be debuggable.** `explainAccess` returns the role AND why (node-override / inherited at
  depth N / workspace-default). Opaque ACLs generate support tickets; an effective-access explainer answers
  "why can this person edit?" at a glance. 🔗 The explainability theme from prior courses.
- **Share links learned their lesson.** Expiry + revocation from the start — a link without them is a
  permanent, un-auditable backdoor. 🔗 Pulse S10's flaw #5, not re-planted; the git history shows a lesson
  that stuck.
- **⚠️ Cache invalidation on move.** Moving a node changes the effective permission of everything beneath it,
  so a permission cache MUST bust on moves. Our request-scoped cache can't go stale; a longer-lived one would
  need explicit busting — a classic place bugs hide.

## Planted debt (ledger — flaw #5 → S13)
Enforcement is **load-time only**: the WS connection checks the member can view; the UI makes viewers
read-only. But **live update messages aren't re-authorized** — a user demoted mid-session keeps an editing
socket. S11's tests cover the load-time path and *not* the live-update path; that absence is the plant. S13
harvests it (per-message ACL revalidation; revoked-mid-session test).

## The debate, cashed
**ACL model: role-based inheritance vs per-resource grants vs capability tokens?** Resolved: role-based
inheritance with overrides (matches how users think about folders, auditable); share links are scoped
capability tokens layered on top. *Model permissions the way users model them, and make "who can access this
and why" a queryable answer.*

## ⚗️ Lab
Set up a workspace where a folder is editable but one doc inside is locked to viewer. Verify inheritance +
override. Then: **connect as an editor, get demoted to viewer in another tab, and keep typing.** Watch your
edits still land (flaw #5). Document exactly where the server should have re-checked and didn't — that's S13.

## Exercise questions
1. Show that `resolveNodeRole` is the depth-1 case of `resolveEffectiveRole`. Why did the `/access` route
   not have to change? What does that tell you about the S02 design?
2. Give a real product scenario for a *restrict* override (subtree less permissive than parent).
3. A node moves to a new parent. Whose effective permissions change, and what must the cache do?
4. Trace flaw #5: at exactly which message would a correct server reject a demoted user's edit, and why
   doesn't ours?

## Further reading
- RBAC vs ABAC vs capabilities · "Google Zanzibar" (relationship-based ACL at scale) · share-token
  expiry/revocation patterns · ADR-0012 (this decision)
