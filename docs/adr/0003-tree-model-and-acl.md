# ADR-0003 — Document tree storage & permissions v1

**Status:** accepted (S02) · **Supersedes:** part of ADR-0001's "everything is a flat doc list"

## Context

Folio needs nested folders and documents with a stable sibling order, and a way to say who can do what.
Two independent decisions: how to **store the tree**, and how to **model access**. Both have a well-known
"do the fancy thing now" temptation, and both are better served by the simple thing first.

## Decision 1 — Tree storage: adjacency list + fractional sibling order

`Node.parentId` (self-relation) is the tree. Sibling order is a base-62 **fractional index** (`sortOrder`),
ported from Tracer S4's `keyBetween`: a move recomputes ONE key between two neighbours — no resequencing,
merge-friendly for when tree ops later flow through the sync engine.

Alternatives considered:

| Model | Subtree read | Move cost | Write complexity |
|-------|-------------|-----------|------------------|
| **Adjacency list** (chosen) | recursive (CTE or app walk) | O(1) — one parent pointer | trivial |
| Materialized path | fast (prefix match) | O(subtree) — rewrite every descendant path | medium |
| Closure table | fast (join) | O(subtree×depth) — rewrite closure rows | high |

**Chosen: adjacency list.** Our trees are shallow (a workspace's doc tree, not a filesystem), reads are
small, and moves must be cheap because dragging is the primary gesture. We compute ancestors (breadcrumb)
and cascade deletes from the workspace's edge list in app code / via Postgres `ON DELETE CASCADE`.

**Triggers to revisit (write them down so future-us doesn't re-argue):** deep trees (10+ levels), or a hot
"give me this whole subtree" query on every page load → switch to **materialized path**. Fast arbitrary
ancestor/descendant membership tests at scale → **closure table**. Not before.

*Lesson: tree storage is a read/write-pattern tradeoff. Pick for your actual depth and query mix, not for
the general case a blog post worries about.*

## Decision 2 — Permissions v1: role-per-node, **no inheritance**

Roles are a total order: `owner > editor > commenter > viewer`. A member has a workspace-default role; a
per-node `Acl` grant overrides it (up or down) **for that one node only**. Resolution is `resolveNodeRole(
workspaceRole, directNodeRole)` — a two-input pure function.

**Explicitly deferred to S11:** inheritance (a folder's role flowing to its descendants), "nearest ancestor
grant wins", public-link roles, and revocation semantics. That is the *entire* S11 deep-dive. Building it
now would bury the idea under plumbing and pre-commit us to a resolution strategy before we've studied it.

The signature is chosen so S11 is a small change: the second argument goes from "this node's grant" to "the
nearest grant found walking ancestors." The resolver's contract — and the `/access` endpoint's response
shape — survive the upgrade untouched. That's the tell of a good seam: the hard future change is *local*.

*Lesson: model the shallow version deliberately, and leave a seam exactly where the depth will land.*

## Consequences

- One planted debt is **watched, not re-planted**: fractional keys still grow under same-slot inserts
  (Tracer flaw #2). We ship `maxKeyLength` as the rebalance signal; rebalancing itself stays deferred
  because our insert pattern is spread across many sibling sets, not one hot column.
- ACL is enforced on document *load*. Enforcing it on live WS update messages is a known gap the S11/S13
  arc closes (flaw #5).
