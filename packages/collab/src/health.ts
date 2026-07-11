import * as Y from "yjs";
import { stateVector, diffUpdate } from "./ydoc";

/**
 * Convergence health (S15). Two instances of the sync server should hold IDENTICAL state for any active
 * document — the CRDT guarantees it. So we periodically compare their state vectors; a mismatch that a full
 * exchange can't reconcile means a real bug.
 *
 * ⚠️ DIVERGENCE SHOULD BE IMPOSSIBLE — so a diverged verdict is a page-me alert, not routine noise. We
 * distinguish `suspect` (state vectors differ — normal mid-propagation) from `diverged` (after exchanging
 * deltas both ways, the docs STILL differ — that's a genuine convergence violation, the one thing the whole
 * capstone promises can't happen).
 */
export type ConvergenceVerdict = "healthy" | "suspect" | "diverged";

/** Compare two docs (e.g. the same document on two server instances) for convergence health. */
export function convergenceHealth(a: Y.Doc, b: Y.Doc): ConvergenceVerdict {
  const svA = stateVector(a);
  const svB = stateVector(b);
  if (equalBytes(svA, svB)) return "healthy"; // identical version — converged

  // They differ. Simulate a full bidirectional exchange on clones; if that reconciles them, it was just
  // in-flight propagation (suspect). If it does NOT, they've genuinely diverged.
  const a2 = clone(a);
  const b2 = clone(b);
  Y.applyUpdate(a2, diffUpdate(b, svA));
  Y.applyUpdate(b2, diffUpdate(a, svB));
  return equalBytes(stateVector(a2), stateVector(b2)) ? "suspect" : "diverged";
}

function clone(doc: Y.Doc): Y.Doc {
  const d = new Y.Doc();
  Y.applyUpdate(d, Y.encodeStateAsUpdate(doc));
  return d;
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * A divergence alerter that fires ONCE per incident (not once per check) — so a real divergence pages you
 * without a storm. The threshold (consecutive suspect checks before alerting) is the S15 drill's tuned knob:
 * too low and normal propagation lag pages you; too high and a real divergence is slow to surface.
 */
export class DivergenceAlerter {
  private suspectStreak = 0;
  private alerted = false;
  constructor(
    private readonly onAlert: (verdict: ConvergenceVerdict) => void,
    /** Consecutive non-healthy checks before we alert (tuned in the drill from 1 → 3). */
    private readonly threshold = 3,
  ) {}

  record(verdict: ConvergenceVerdict): void {
    if (verdict === "diverged") {
      if (!this.alerted) this.onAlert("diverged"); // diverged is always immediately actionable
      this.alerted = true;
      return;
    }
    if (verdict === "suspect") {
      this.suspectStreak++;
      if (this.suspectStreak >= this.threshold && !this.alerted) {
        this.onAlert("suspect");
        this.alerted = true;
      }
      return;
    }
    // healthy → reset the incident.
    this.suspectStreak = 0;
    this.alerted = false;
  }
}
