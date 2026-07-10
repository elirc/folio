import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";

/**
 * Awareness = presence + cursors (S07). This is Yjs's EPHEMERAL channel, and that distinction is the whole
 * lesson.
 *
 * 🔗 DURABLE vs EPHEMERAL, fourth appearance — now reflexive. A cursor, a name, a colour, "who is here" —
 * none of it belongs in the document. It has no history, it shouldn't persist, and it certainly shouldn't
 * enter the Yjs update log (which is the durable, replicated, forever-growing record of the document's
 * content). Awareness rides its OWN protocol: last-writer-wins per client, auto-expiring on disconnect,
 * never merged into the doc. Put a cursor in the doc log and you'd replicate + persist every caret twitch
 * to everyone forever — the S04 state-classification mistake, at the network layer.
 *
 * Contrast S05, where cursors were absolute offsets shoved through the same channel as the document. Here
 * they're relative positions (Yjs-managed) on a separate ephemeral channel — correct on both axes.
 */

export interface PresenceUser {
  id: string;
  name: string;
  color: string;
}

export function createAwareness(doc: Y.Doc): Awareness {
  return new Awareness(doc);
}

/** Publish this client's presence + (relative) cursor. Ephemeral: it never touches the doc's update log. */
export function setLocalPresence(awareness: Awareness, user: PresenceUser, cursor?: { anchor: unknown; head: unknown }): void {
  awareness.setLocalStateField("user", user);
  if (cursor) awareness.setLocalStateField("cursor", cursor);
}

/** The distinct users currently present (de-duped by user id), derived from awareness states. */
export function presentUsers(awareness: Awareness): PresenceUser[] {
  const seen = new Map<string, PresenceUser>();
  for (const state of awareness.getStates().values()) {
    const user = (state as { user?: PresenceUser }).user;
    if (user) seen.set(user.id, user);
  }
  return [...seen.values()];
}

export { Awareness };
