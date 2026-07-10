import { z } from "zod";

/**
 * The document vocabulary (S01). A `Node` is an entry in the workspace tree — a `doc` (a document) or a
 * `folder`. `DocState` holds the document's content, which for now is plaintext.
 *
 * 🔗 NAMING FOR THE FUTURE: we call it `DocState`, not `content`, on purpose. By S07 this plaintext string
 * becomes a **Yjs update log** (a binary CRDT changelog + periodic snapshots — see ADR-0002's roadmap).
 * Naming it `DocState` now leaves room to grow into that without a rename; naming it `content` would have
 * boxed us into "a string is the document," which is exactly the assumption the capstone dismantles.
 */
export type NodeType = "doc" | "folder";

/** The shape stored in DocState today — plaintext. This is deliberately the *wrong* long-term model. */
export const PlaintextStateSchema = z.object({ text: z.string() });
export type PlaintextState = z.infer<typeof PlaintextStateSchema>;

/** Save payload from the client (S01: just the text; S05+ this becomes CRDT updates). */
export const SaveDocSchema = z.object({ text: z.string() });
export type SaveDoc = z.infer<typeof SaveDocSchema>;

// ── WS protocol (S01: an echo; the real sync protocol arrives S05/S07) ───────────────────────────
export const EchoMessageSchema = z.object({ type: z.literal("echo"), payload: z.string() });

export const ClientMessageSchema = z.discriminatedUnion("type", [EchoMessageSchema]);
export const ServerMessageSchema = z.discriminatedUnion("type", [EchoMessageSchema]);
export type ClientMessage = z.infer<typeof ClientMessageSchema>;
export type ServerMessage = z.infer<typeof ServerMessageSchema>;
