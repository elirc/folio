# Sprint 02 — Workspaces, Document Tree & Permissions v1

**Branch:** `sprint-02/tree-permissions` · **Size:** M · Ritual: [00-workflow.md](00-workflow.md)

**Goal:** The document tree (nested folders + docs with ordering) and a first-cut permission model. Mostly learner-led `[L]` (workspaces/auth are old news); the new material is tree modeling and ACL basics that S11 will deepen.

## A — Issues
1. `Workspace + Member auth (learner-led fast-forward)`
2. `Node tree: folders + docs, parent/child, sibling ordering (fractional index — 🔗 Tracer S4)`
3. `Permissions v1: role per member + per-node role (owner/editor/commenter/viewer)`
4. `Tree UI: sidebar, create/move/rename, breadcrumb`

## B — Commits
| # | Commit | Notes |
|---|--------|------|
| 1 | `[L] feat(db): Workspace, Member, Node (tree), ACL v1` | |
| 2 | `[L] feat(shared): fractional index for sibling order` | 🔗 direct reuse of Tracer S4's keyBetween — the learner ports their own prior work |
| 3 | `[L] feat(api): node CRUD — create/move/rename/delete with cycle prevention` | ⚠️ moving a folder into its own descendant = a cycle (🔗 Relay S8 DAG validation, tree-shaped) |
| 4 | `[A] feat(api): ACL resolution v1 — role on node, no inheritance yet` | AI writes this; inheritance is the S11 deep-dive, flagged here |
| 5 | `[L] feat(web): tree sidebar — DnD reorder/reparent, rename, breadcrumbs` | |
| 6 | `[L] test: tree ops, cycle prevention, ACL v1 checks` | |
| 7 | `[A] docs: ADR-0003 tree model + ACL-inheritance-later; curriculum note` | |

## C — Review order
Tree model (1) → cycle prevention (3) → ACL v1 (4, note inheritance deferred).

## D — Teaching comments (~7)
- fractional index reuse — 🔗 review-lens: the learner ports keyBetween from Tracer; the AI review checks they carried the *rebalancing* lesson too (Tracer's flaw #2) — did they, or did they re-plant it?
- cycle prevention — ⚠️ a tree that allows moving a node into its own subtree isn't a tree; the ancestor-check on move (🔗 same shape as Relay's DAG cycle guard)
- ACL v1 simplicity — 📘 deliberately shallow: role-per-node, no inheritance; S11 makes inheritance the topic; over-building ACL now would obscure it
- move semantics — 📘 reparenting + reordering in one operation (a drag is one intent — 🔗 Tracer S4); the fractional key is recomputed for the new sibling set
- tree queries — 🔍 review-lens: recursive tree reads (ancestors for breadcrumb, descendants for delete) — recursive CTE vs application recursion; the learner picks, AI reviews the choice

## E — Debate
**"Adjacency list vs materialized path vs closure table for the tree?"** Adjacency: simple, recursive reads. Materialized path: fast subtree queries, path-update cost on move. Closure table: fast everything, write complexity. **Resolution:** adjacency list + recursive CTEs (simple, and our trees are shallow); the ADR notes the triggers for materialized paths (deep trees, hot subtree queries). Lesson: *tree storage is a read/write-pattern tradeoff; pick for your actual depth and query mix.*

## F/G — Close
- Squash: `feat(sprint-02): document tree, permissions v1 (closes #…)`
- Deferred: ACL inheritance (S11), trash/restore, tree search (S14).
- Recap idea: *the tree is easy; making permissions flow down it correctly is a whole sprint later — for now, keep it shallow and honest.*
