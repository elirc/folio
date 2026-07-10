/**
 * Document rooms (S05) — the pure membership registry behind the naive real-time relay. Kept free of any
 * `ws` types so the join/leave/peer logic is unit-testable without opening a socket. The gateway (ws.ts)
 * owns the sockets; this owns *who is where*.
 *
 * A "member" is generic (`<T>`) so tests can use plain objects and production can use live WebSockets.
 */
export interface Member<T> {
  socket: T;
  user: { id: string; name: string; color: string };
}

export class Rooms<T> {
  private readonly byDoc = new Map<string, Set<Member<T>>>();
  private readonly bySocket = new Map<T, { docId: string; member: Member<T> }>();

  /** Add a socket to a document's room (leaving any prior room first — one doc per socket). */
  join(docId: string, socket: T, user: Member<T>["user"]): void {
    this.leave(socket);
    const member: Member<T> = { socket, user };
    let set = this.byDoc.get(docId);
    if (!set) this.byDoc.set(docId, (set = new Set()));
    set.add(member);
    this.bySocket.set(socket, { docId, member });
  }

  /** Remove a socket from whatever room it's in (idempotent). */
  leave(socket: T): string | null {
    const entry = this.bySocket.get(socket);
    if (!entry) return null;
    this.byDoc.get(entry.docId)?.delete(entry.member);
    if (this.byDoc.get(entry.docId)?.size === 0) this.byDoc.delete(entry.docId);
    this.bySocket.delete(socket);
    return entry.docId;
  }

  /** The doc a socket is currently in, if any. */
  docOf(socket: T): string | null {
    return this.bySocket.get(socket)?.docId ?? null;
  }

  /** Everyone in a room. */
  peers(docId: string): Member<T>[] {
    return [...(this.byDoc.get(docId) ?? [])];
  }

  /** Everyone in a room EXCEPT the given socket (the broadcast target set). */
  others(docId: string, socket: T): Member<T>[] {
    return this.peers(docId).filter((m) => m.socket !== socket);
  }

  /** The distinct users present in a room (for a presence message). */
  presence(docId: string): Member<T>["user"][] {
    const seen = new Map<string, Member<T>["user"]>();
    for (const m of this.peers(docId)) seen.set(m.user.id, m.user);
    return [...seen.values()];
  }
}
