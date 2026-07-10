# ADR-0012 — Permissions v2: ACL inheritance & sharing

**Status:** accepted (S11) · **Cashes:** the S02 seam (ADR-0003) · **Plants:** flaw #5 (live-update authz gap → S13)

## Context

S02 shipped ACL v1 — a role per node, no inheritance — and *designed the resolver's seam* for this sprint.
S11 cashes it: permissions flow down the tree with overrides, share links layer on top, and enforcement
reaches (partway into) the live sync layer.

## Decisions

### 1. Role-based inheritance with overrides (both ways)
Effective role = the **nearest grant** walking from the node up to the root; absent any grant, the workspace
default. `resolveEffectiveRole(workspaceRole, grantsNearestFirst)`. Overrides work **up or down**: a subtree
can be *more* permissive ("this folder is view-only but this doc is editable") **or** *less* ("this
workspace is editable but this folder is locked"). We take the nearest grant verbatim — never `max()` it —
because real ACLs need grant-AND-restrict.

**The S02 seam paid off exactly as designed:** `resolveNodeRole(ws, directGrant)` is just the depth-1 case of
`resolveEffectiveRole(ws, [grant])`, and the `/access` route contract is UNCHANGED — the hard change was
local to the resolver. That's what a good seam buys: the deep future change stays local.

### 2. Permissions must be debuggable — `explainAccess`
The resolver returns not just the role but *why*: `node-override` | `inherited (depth N)` | `workspace-
default`. 🔗 The explainability theme from prior courses: opaque ACLs generate support tickets ("why can this
person edit?!"). Make "who can access this and why" a queryable answer.

### 3. Share links = scoped capability tokens (with expiry + revocation)
A share link grants a role to any holder until it expires or is revoked. 🔗 Pulse S10's lesson learned:
expiry + revocation are mandatory — a link without them is a permanent, un-auditable backdoor. Built in from
the start (no re-planted flaw). `resolveShareLink` returns a role or a typed denial (`revoked`/`expired`/
`not-found`).

### 4. Cache invalidation on move (the subtle edge)
Effective permissions are cached per (member, node). ⚠️ Moving a node changes the effective permission of
*everything beneath it*, so the cache MUST bust on tree moves. Our resolver caches only per-request (can't go
stale across mutations); a longer-lived cache needs explicit busting on move — noted so future-us doesn't
introduce a stale-permission bug there.

## The ACL model debate

Role-based inheritance (chosen) vs per-resource grants vs capability tokens. Per-resource: precise,
unmanageable at scale. Capabilities: elegant, hard to audit ("who can see this?"). Role-based inheritance
matches how users think about folders and is auditable; share links are scoped capabilities *layered on
top*. *Lesson: model permissions the way users model them (folders inherit), and make "who can access this
and why" a queryable answer.*

## ⚠️ Planted debt — flaw #5 (live-update authz gap)

Enforcement checks ACL **at document load** (the WS connection verifies the member can view; the UI makes
viewers read-only). But **live Yjs update messages are NOT re-authorized.** A user who was an editor when
they connected, then gets *demoted to viewer*, keeps a live socket that the server happily applies updates
from — because we trusted the load-time check + the client UI, and never re-check per message.

> **Ledger flaw #5** — *"ACL checked on document load but not on live update messages — a demoted
> collaborator's in-flight socket keeps editing."* Harvested in **S13** (per-message ACL revalidation;
> revoked-mid-session test). The tell: S11's tests cover load-time enforcement but *not* the live-update
> path — that absence is the plant.

## Consequences

- The inheritance resolver + explainer + share links ship; enforcement is load-time only (by design, for now).
- Deferred: per-block permissions, guest external sharing, audit log of access.

*Lesson: permissions on a tree are inheritance + overrides + a cache that busts on moves — and enforcing
them at load is only half the job. S13 finds the other half.*
