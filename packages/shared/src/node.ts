import { z } from "zod";

/**
 * Tree-operation payloads (S02). Each op is ONE intent: create a node, rename it, or move it (reparent +
 * reorder together, because a drag is a single gesture — 🔗 Tracer S4). The API validates with these, runs
 * the pure tree rules (cycle check, fractional key), then persists.
 */

export const NodeTypeSchema = z.enum(["doc", "folder"]);

export const CreateNodeSchema = z.object({
  workspaceId: z.string().min(1),
  type: NodeTypeSchema.default("doc"),
  title: z.string().trim().min(1).max(200).default("Untitled"),
  parentId: z.string().nullable().default(null),
  // Optional: place after this sibling. Omitted ⇒ append to the end of the sibling set.
  afterSiblingId: z.string().nullable().default(null),
});
export type CreateNode = z.infer<typeof CreateNodeSchema>;

export const RenameNodeSchema = z.object({
  title: z.string().trim().min(1).max(200),
});
export type RenameNode = z.infer<typeof RenameNodeSchema>;

/**
 * A move is a reparent AND a reorder in one shot. `newParentId: null` moves to the workspace root. The two
 * sibling ids frame where in the target parent the node lands; the API computes a fractional key between
 * them. Sending both halves of one drag as one request keeps the tree from ever being briefly inconsistent.
 */
export const MoveNodeSchema = z.object({
  newParentId: z.string().nullable(),
  beforeSiblingId: z.string().nullable().default(null),
  afterSiblingId: z.string().nullable().default(null),
});
export type MoveNode = z.infer<typeof MoveNodeSchema>;
