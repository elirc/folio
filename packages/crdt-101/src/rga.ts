import { LamportClock, opIdCmp, opIdEq, opIdKey, type OpId, type SiteId } from "./id";

/**
 * crdt-101: a Replicated Growable Array (RGA) — a sequence CRDT for PLAIN TEXT (S06). This is the reference
 * core: the hardest ~60 lines in the course. Read it after you've felt S05's data loss; this is the machine
 * that makes it impossible.
 *
 * The model: the document is a list of ELEMENTS, each an immutable identity (OpId) carrying one character
 * and a pointer to its `originLeft` — the element it was inserted to the right of. Concurrent inserts at the
 * same origin are ordered deterministically by id (higher id wins the position closer to the origin). Every
 * comparison uses only immutable data (ids + origin), so all replicas compute the identical order.
 *
 * ⚠️ This is a LEARNING ARTIFACT, not the production system. It handles plaintext; rich text (blocks, marks,
 * ProseMirror) is research-grade, which is why S07 adopts Yjs. But after building and fuzzing this, we read
 * Yjs's docs as peers who built the toy — not as cargo-culters.
 */

export interface Element {
  id: OpId;
  value: string;
  originLeft: OpId | null;
}

export type Op =
  | { type: "insert"; id: OpId; value: string; originLeft: OpId | null }
  | { type: "delete"; id: OpId };

export class RGA {
  private readonly clock: LamportClock;
  /** All elements in document order. */
  private elements: Element[] = [];
  private readonly byId = new Map<string, Element>();
  /** Ops already applied — makes `apply` idempotent (apply the same op twice = no-op). */
  private readonly applied = new Set<string>();
  /** Inserts whose `originLeft` hasn't arrived yet — buffered until causally ready. */
  private pending: Op[] = [];

  constructor(public readonly site: SiteId) {
    this.clock = new LamportClock(site);
  }

  // ── local edits: produce an op AND apply it locally ────────────────────────────────────────────
  /** Insert `value` at index `index` (0..length). Returns the op to broadcast. */
  insert(index: number, value: string): Op {
    const originLeft = this.elementBefore(index)?.id ?? null;
    const op: Op = { type: "insert", id: this.clock.tick(), value, originLeft };
    this.apply(op);
    return op;
  }

  /** Delete the char at `index`. Returns the op, or null if index is out of range. */
  deleteAt(index: number): Op | null {
    const el = this.elements[index];
    if (!el) return null;
    const op: Op = { type: "delete", id: el.id };
    this.apply(op);
    return op;
  }

  // ── remote application: idempotent, commutative, causally buffered ──────────────────────────────
  apply(op: Op): void {
    this.integrate(op);
    this.drainPending();
  }

  /** Integrate ONE op (or buffer it) without touching the pending queue — the drain loop owns that. */
  private integrate(op: Op): void {
    if (!this.isReady(op)) {
      this.pending.push(op);
      return;
    }
    if (op.type === "insert") {
      const key = opIdKey(op.id);
      if (this.applied.has(key)) return; // idempotent
      this.clock.observe(op.id);
      this.integrateInsert({ id: op.id, value: op.value, originLeft: op.originLeft });
      this.applied.add(key);
    } else {
      this.clock.observe(op.id);
      // HARD DELETE: splice the element out and forget its id entirely.
      const idx = this.indexOfId(op.id);
      if (idx >= 0) {
        this.elements.splice(idx, 1);
        this.byId.delete(opIdKey(op.id));
      }
    }
  }

  /** Is an op's causal dependency satisfied? insert ⇒ origin present; delete ⇒ target present. */
  private isReady(op: Op): boolean {
    if (op.type === "insert") return !op.originLeft || this.byId.has(opIdKey(op.originLeft));
    return this.byId.has(opIdKey(op.id));
  }

  /** Retry buffered ops whose dependency may now exist (a fixpoint pass — no recursion into apply). */
  private drainPending(): void {
    let progressed = true;
    while (progressed) {
      progressed = false;
      const still: Op[] = [];
      for (const op of this.pending) {
        if (this.isReady(op)) {
          this.integrate(op); // integrate directly; do NOT re-enter drainPending here
          progressed = true;
        } else {
          still.push(op);
        }
      }
      this.pending = still;
    }
  }

  /**
   * RGA insertion rule. Place `el` after its origin, but AFTER any concurrent elements that should precede
   * it. Walking rightward from the origin, we skip an element when it belongs to a deeper/later subtree, and
   * among true same-origin siblings the HIGHER id sits closer to the origin. Comparisons use only immutable
   * data (ids + origin), so every replica computes the identical position ⇒ convergence.
   */
  private integrateInsert(el: Element): void {
    const originIndex = el.originLeft ? this.indexOfId(el.originLeft) : -1;
    let i = originIndex + 1;
    for (; i < this.elements.length; i++) {
      const cur = this.elements[i]!;
      const curOriginIndex = cur.originLeft ? this.indexOfId(cur.originLeft) : -1;
      if (curOriginIndex < originIndex) break; // cur belongs to an earlier region — stop
      if (curOriginIndex === originIndex) {
        // same-origin sibling: higher id goes first (closer to origin)
        if (opIdCmp(cur.id, el.id) > 0) continue;
        break;
      }
      // curOriginIndex > originIndex: cur is nested under a sibling before us — skip its whole subtree
    }
    this.elements.splice(i, 0, el);
    this.byId.set(opIdKey(el.id), el);
  }

  // ── reads ──────────────────────────────────────────────────────────────────────────────────────
  toString(): string {
    let out = "";
    for (const el of this.elements) out += el.value;
    return out;
  }

  get length(): number {
    return this.elements.length;
  }

  private indexOfId(id: OpId): number {
    return this.elements.findIndex((e) => opIdEq(e.id, id));
  }

  /** The element just before `index` (index 0 ⇒ null → insert at the very start). */
  private elementBefore(index: number): Element | undefined {
    if (index <= 0) return undefined;
    return this.elements[Math.min(index, this.elements.length) - 1];
  }
}
