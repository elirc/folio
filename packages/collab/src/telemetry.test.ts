import { describe, it, expect } from "vitest";
import { LatencyHistogram, RateCounter } from "./telemetry";
import { convergenceHealth, DivergenceAlerter } from "./health";
import * as Y from "yjs";
import { encodeState, applyUpdate } from "./ydoc";

describe("telemetry (S15)", () => {
  it("LatencyHistogram tracks mean + approximate percentiles, bounded memory", () => {
    const h = new LatencyHistogram([1, 5, 16, 50]);
    for (const ms of [1, 2, 3, 4, 100]) h.observe(ms);
    expect(h.total).toBe(5);
    expect(h.mean).toBeCloseTo(22);
    expect(h.percentile(50)).toBeLessThanOrEqual(16);
  });

  it("RateCounter reports events/sec over a sliding window", () => {
    const r = new RateCounter(1000); // 1s window
    r.tick(0);
    r.tick(100);
    r.tick(200);
    expect(r.ratePerSec(300)).toBeCloseTo(3); // 3 events in the 1s window
    expect(r.ratePerSec(2000)).toBe(0); // all aged out
  });
});

describe("convergence health (S15) — divergence should be impossible", () => {
  it("identical docs are healthy", () => {
    const a = new Y.Doc();
    a.getText("t").insert(0, "hi");
    const b = new Y.Doc();
    applyUpdate(b, encodeState(a));
    expect(convergenceHealth(a, b)).toBe("healthy");
  });

  it("docs mid-propagation are only SUSPECT (a full exchange reconciles them)", () => {
    const a = new Y.Doc();
    a.getText("t").insert(0, "aaa");
    const b = new Y.Doc();
    b.getText("t").insert(0, "bbb");
    // Different state vectors, but a real CRDT exchange WOULD reconcile → suspect, not diverged.
    expect(convergenceHealth(a, b)).toBe("suspect");
  });

  it("the alerter fires once per incident, after the threshold of suspect checks", () => {
    const fired: string[] = [];
    const alerter = new DivergenceAlerter((v) => fired.push(v), 3);
    alerter.record("suspect");
    alerter.record("suspect");
    expect(fired).toHaveLength(0); // below threshold
    alerter.record("suspect");
    expect(fired).toEqual(["suspect"]); // fired once
    alerter.record("suspect");
    expect(fired).toHaveLength(1); // not again within the incident
    alerter.record("healthy"); // incident resolved
    alerter.record("diverged");
    expect(fired).toEqual(["suspect", "diverged"]); // diverged fires immediately
  });
});
