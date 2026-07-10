# Curriculum Note — Sprint 2: Workspaces, Document Tree & Permissions v1

## Learning objectives
- Model a tree you can read, reorder, and reparent cheaply — and know *why* you chose that storage.
- Prevent the one move that turns a tree into "not a tree" (a cycle) with a pure, tested rule.
- Model access **shallowly on purpose**, leaving a clean seam for the S11 inheritance deep-dive.
- Practice **porting your own prior work** — and carrying its *lessons*, not just its code.

## Key concepts
- **Port the lesson, not just the function.** The learner lifts `keyBetween` from Tracer S4. The review's
  job isn't "is the port correct" — it's *did you remember Tracer flaw #2?* Repeated inserts into the same
  gap grow keys without bound. We port the generator, ship `maxKeyLength` as the watch, and name rebalancing
  as deferred — so the debt is **acknowledged, not silently re-planted.** Re-using code without re-reading
  why it was fragile is how you inherit someone's bug (even your own).
- **A tree is a DAG with ≤1 parent.** Moving a folder into its own descendant closes a cycle. Because each
  node has one parent, the check collapses from "search all paths" (Relay S8's DAG guard) to "walk the
  single parent chain." Same idea, cheaper shape — 🔗 recognizing that a new problem is an old problem in a
  tighter constraint is a senior move.
- **One drag = one request.** A reparent-and-reorder is a single intent; sending it as one `/move` (new
  parent + two neighbour ids → one fractional key) means the tree is never briefly inconsistent. 🔗 Tracer
  S4's "a drag is one mutation."
- **Deliberately shallow ACL.** v1 resolves a role from two inputs: workspace default + a direct node grant.
  No inheritance. That's not laziness — folder→descendant inheritance IS S11. The resolver's signature is
  chosen so S11 changes one argument ("this node's grant" → "nearest ancestor's grant") and nothing else.
  📘 **Building the shallow version well is how you earn a clean seam for the deep version.**
- **Adjacency list, chosen not defaulted (ADR-0003).** We wrote down the triggers (deep trees, hot subtree
  reads) that would flip us to materialized path / closure table. A default you can defend with its
  switch-conditions is an architecture; a default you picked without thinking is a liability.

## The debate, cashed
**Adjacency list vs. materialized path vs. closure table?** Resolved: adjacency list + recursive reads —
our trees are shallow and moves must be O(1). *Tree storage is a read/write-pattern tradeoff; pick for your
actual depth and query mix.*

## Exercise questions
1. Sketch the cycle-prevention walk. Why is the visited-set guard there even though a valid tree can't loop?
2. Before reading S11: sketch how you'd make a folder's `editor` role reach every doc inside it. Which
   argument of `resolveNodeRole` changes? Which parts of the endpoint *don't*?
3. Tracer flaw #2 (unbounded key growth) is ported here. Why is it acceptable to defer the fix in Folio when
   Tracer harvested it in S12? (Hint: hot single column vs. many sibling sets.)
4. When would you abandon the adjacency list? Name the concrete query and depth that triggers each of the
   two alternatives.

## Further reading
- "Trees in SQL" (adjacency vs. path vs. closure) · Postgres recursive CTEs · Figma's fractional indexing
  post · RBAC vs. ABAC (a first orientation for S11)
