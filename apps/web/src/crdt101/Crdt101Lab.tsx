import { useRef, useState, type CSSProperties } from "react";
import { RGA, type Op } from "@folio/crdt-101";

/**
 * The crdt-101 lab (S06) — the emotional payoff. Two panes, each its OWN replica of a plaintext RGA, in one
 * browser tab. Toggle "connected" off to simulate a network partition, type DIFFERENT things in both panes,
 * then reconnect — and watch them **converge, keeping both edits.** This is the S05 pain (a vanishing
 * paragraph) *gone*, in a toy you can hold in your head. No server, no Yjs — just the CRDT you built.
 */

/** Diff the pane's text against its RGA and emit the insert/delete ops that reconcile them. */
function syncTextToRga(rga: RGA, next: string): Op[] {
  const cur = rga.toString();
  let p = 0;
  while (p < cur.length && p < next.length && cur[p] === next[p]) p++;
  let s = 0;
  while (s < cur.length - p && s < next.length - p && cur[cur.length - 1 - s] === next[next.length - 1 - s]) s++;
  const delCount = cur.length - p - s;
  const insStr = next.slice(p, next.length - s);
  const ops: Op[] = [];
  for (let i = 0; i < delCount; i++) {
    const op = rga.deleteAt(p);
    if (op) ops.push(op);
  }
  for (let i = 0; i < insStr.length; i++) ops.push(rga.insert(p + i, insStr[i]!));
  return ops;
}

export function Crdt101Lab() {
  const left = useRef(new RGA("left"));
  const right = useRef(new RGA("right"));
  const outbox = useRef<{ toLeft: Op[]; toRight: Op[] }>({ toLeft: [], toRight: [] });
  const [connected, setConnected] = useState(true);
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);

  const edit = (side: "left" | "right", text: string) => {
    const mine = side === "left" ? left.current : right.current;
    const ops = syncTextToRga(mine, text);
    // Queue ops for the other replica; deliver immediately if connected.
    if (side === "left") outbox.current.toRight.push(...ops);
    else outbox.current.toLeft.push(...ops);
    if (connected) flush();
    rerender();
  };

  const flush = () => {
    for (const op of outbox.current.toLeft) left.current.apply(op);
    for (const op of outbox.current.toRight) right.current.apply(op);
    outbox.current = { toLeft: [], toRight: [] };
  };

  const reconnect = () => {
    setConnected(true);
    flush();
    rerender();
  };

  const converged = left.current.toString() === right.current.toString();
  const pending = outbox.current.toLeft.length + outbox.current.toRight.length;

  return (
    <section style={wrap}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <strong style={{ color: "#7c5cff" }}>🧪 crdt-101 lab</strong>
        <button style={btn} onClick={() => (connected ? setConnected(false) : reconnect())}>
          {connected ? "Disconnect ✂️" : `Reconnect 🔗 (${pending} queued)`}
        </button>
        <span style={{ fontSize: 12, color: converged ? "#2fbf71" : "#e0a54b" }}>
          {converged ? "converged ✓ (identical text, both edits kept)" : "diverged — reconnect to converge"}
        </span>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <Pane label="Replica A" value={left.current.toString()} onChange={(t) => edit("left", t)} />
        <Pane label="Replica B" value={right.current.toString()} onChange={(t) => edit("right", t)} />
      </div>
      <p style={{ color: "#7c8794", fontSize: 12, marginTop: 10 }}>
        Try it: <b>Disconnect</b>, type different words in A and B, then <b>Reconnect</b>. Both survive and
        the panes match — the S05 clobber is gone. This is the CRDT you built, doing its one job.
      </p>
    </section>
  );
}

function Pane(props: { label: string; value: string; onChange: (t: string) => void }) {
  return (
    <label style={{ flex: 1 }}>
      <div style={{ fontSize: 12, color: "#8b93a1", marginBottom: 4 }}>{props.label}</div>
      <textarea style={area} value={props.value} onChange={(e) => props.onChange(e.target.value)} spellCheck={false} />
    </label>
  );
}

const wrap: CSSProperties = { border: "1px solid #232a32", borderRadius: 10, padding: 14, marginTop: 16 };
const area: CSSProperties = {
  width: "100%",
  minHeight: 120,
  background: "#0b0d10",
  color: "#e6e9ef",
  border: "1px solid #232a32",
  borderRadius: 8,
  padding: 10,
  font: "13px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace",
  resize: "vertical",
};
const btn: CSSProperties = {
  background: "#14181d",
  color: "#e6e9ef",
  border: "1px solid #2b333d",
  borderRadius: 6,
  padding: "5px 10px",
  cursor: "pointer",
  fontSize: 12,
};
