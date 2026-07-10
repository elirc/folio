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

// ── WS protocol ──────────────────────────────────────────────────────────────────────────────────
// S01 was an echo. S05 makes it a NAIVE real-time relay: clients join a per-document room and broadcast
// whole-document updates (last-write-wins — flaw #1, announced) plus best-effort presence + cursors.
// S07 replaces `doc_update`'s whole-doc payload with incremental Yjs updates; the room/presence framing
// survives, which is why it's modelled as its own message rather than baked into the doc payload.

/** Join (subscribe to) a document's room. The client sends this first. */
export const JoinMessageSchema = z.object({
  type: z.literal("join"),
  docId: z.string(),
  user: z.object({ id: z.string(), name: z.string(), color: z.string() }),
});

/** A WHOLE-DOCUMENT update (S05, LWW). `doc` is the entire ProseMirror JSON; `rev` a monotonic counter. */
export const DocUpdateMessageSchema = z.object({
  type: z.literal("doc_update"),
  docId: z.string(),
  rev: z.number(),
  doc: z.unknown(), // the ENTIRE document, every keystroke-burst — the naïveté S07 removes
});

/** Best-effort presence: who is in the room. */
export const PresenceMessageSchema = z.object({
  type: z.literal("presence"),
  docId: z.string(),
  users: z.array(z.object({ id: z.string(), name: z.string(), color: z.string() })),
});

/** A live cursor as ABSOLUTE offsets — meaningless the instant the doc changes underneath it (S05 flaw). */
export const CursorMessageSchema = z.object({
  type: z.literal("cursor"),
  docId: z.string(),
  user: z.object({ id: z.string(), name: z.string(), color: z.string() }),
  anchor: z.number(),
  head: z.number(),
});

// Client → server and server → client share most shapes; presence is server-authored (fan-in of joins).
export const ClientMessageSchema = z.discriminatedUnion("type", [
  JoinMessageSchema,
  DocUpdateMessageSchema,
  CursorMessageSchema,
]);
export const ServerMessageSchema = z.discriminatedUnion("type", [
  DocUpdateMessageSchema,
  PresenceMessageSchema,
  CursorMessageSchema,
]);
export type JoinMessage = z.infer<typeof JoinMessageSchema>;
export type DocUpdateMessage = z.infer<typeof DocUpdateMessageSchema>;
export type PresenceMessage = z.infer<typeof PresenceMessageSchema>;
export type CursorMessage = z.infer<typeof CursorMessageSchema>;
export type ClientMessage = z.infer<typeof ClientMessageSchema>;
export type ServerMessage = z.infer<typeof ServerMessageSchema>;
