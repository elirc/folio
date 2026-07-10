import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { RGA, type Op } from "./rga";

/**
 * THE CONVERGENCE FUZZER (S06) — the single most valuable thing built this sprint, and SACRED from here on
 * (every later collaboration sprint keeps a fuzzer alive). Convergence is a *property*, not an example:
 *
 *    for ANY set of operations delivered in ANY order to ANY replica, all replicas end in IDENTICAL state.
 *
 * Only randomized interleaving finds the violations that hand-picked examples miss. 🔗 The learner has built
 * convergence fuzzers before (Tracer/Pulse chaos); this is the canonical one.
 *
 * The model: N replicas each make some local edits (producing ops); every op is then delivered to every
 * OTHER replica in a RANDOM order (simulating network reordering + partitions). The RGA's causal buffering
 * absorbs out-of-order delivery. At the end, all replicas must `toString()` identically.
 */

interface PlannedOp {
  origin: number; // which replica authored it
  kind: "insert" | "delete";
  index: number; // position hint (clamped at apply time)
  char: string;
}

/** Run one concurrent scenario and return every replica's final text. */
function runScenario(siteCount: number, plan: PlannedOp[], deliveryOrder: number[]): string[] {
  const replicas = Array.from({ length: siteCount }, (_, i) => new RGA(`s${i}`));
  const ops: { op: Op; origin: number }[] = [];

  // Phase 1: each planned op is authored on its origin replica (local apply), producing a broadcastable op.
  for (const p of plan) {
    const r = replicas[p.origin]!;
    if (p.kind === "insert") {
      const at = r.length === 0 ? 0 : p.index % (r.length + 1);
      ops.push({ op: r.insert(at, p.char), origin: p.origin });
    } else if (r.length > 0) {
      const at = p.index % r.length;
      const op = r.deleteAt(at);
      if (op) ops.push({ op, origin: p.origin });
    }
  }

  // Phase 2: deliver every op to every OTHER replica, in the given (shuffled) order.
  for (const idx of deliveryOrder) {
    const entry = ops[idx % ops.length];
    if (!entry) continue;
    for (let r = 0; r < siteCount; r++) {
      if (r !== entry.origin) replicas[r]!.apply(entry.op);
    }
  }
  // Deliver everything once more to guarantee full propagation regardless of the shuffled order above.
  for (const { op, origin } of ops) {
    for (let r = 0; r < siteCount; r++) if (r !== origin) replicas[r]!.apply(op);
  }

  return replicas.map((r) => r.toString());
}

describe("crdt-101 convergence (S06) — SACRED", () => {
  it("hand-built scenario: two concurrent inserts at the same spot converge (no clobber — the S05 fix)", () => {
    const a = new RGA("a");
    const b = new RGA("b");
    // Both start empty; both insert a char at index 0 concurrently.
    const opA = a.insert(0, "A");
    const opB = b.insert(0, "B");
    a.apply(opB);
    b.apply(opA);
    // They converge (identical text) AND keep BOTH characters — no last-write-wins clobber.
    expect(a.toString()).toBe(b.toString());
    expect(a.toString().length).toBe(2);
    expect(a.toString().split("").sort().join("")).toBe("AB");
  });

  it("property: any interleaving of any ops → all replicas converge", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 4 }), // replicas
        fc.array(
          fc.record({
            origin: fc.nat(3),
            kind: fc.constantFrom("insert" as const, "delete" as const),
            index: fc.nat(20),
            char: fc.constantFrom("a", "b", "c", "d", "e", "x", "y", "z"),
          }),
          { minLength: 1, maxLength: 40 },
        ),
        fc.array(fc.nat(200), { minLength: 0, maxLength: 60 }),
        (siteCount, rawPlan, deliveryOrder) => {
          const plan = rawPlan.map((p) => ({ ...p, origin: p.origin % siteCount }));
          const finals = runScenario(siteCount, plan, deliveryOrder);
          // Convergence: every replica ends identical.
          for (const s of finals) expect(s).toBe(finals[0]);
        },
      ),
      { numRuns: 300 },
    );
  });

  it("idempotent & commutative: applying the same ops twice, in different orders, is stable", () => {
    const a = new RGA("a");
    const opsForA = ["h", "i"].map((c, i) => a.insert(i, c));
    const b = new RGA("b");
    // apply in reverse order, and twice (idempotency)
    for (const op of [...opsForA].reverse()) b.apply(op);
    for (const op of opsForA) b.apply(op);
    expect(b.toString()).toBe(a.toString());
  });
});
