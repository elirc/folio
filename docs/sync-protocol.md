# Folio Sync Protocol (S07)

Our custom Yjs provider protocol. We build it ourselves — Yjs ships `y-websocket` — because the transport a
collaborative editor depends on must not be a black box. It is small on purpose.

## Messages (JSON-framed; a production build would use binary frames)

| Message | Direction | Payload | Meaning |
|---------|-----------|---------|---------|
| `sync1` | both, on connect | `{ sv }` (base64 state vector) | "Here's what I already have — send me what I lack." |
| `sync2` | reply to `sync1` | `{ update }` (base64 delta) | "Here is exactly the delta for your state vector." |
| `update` | steady state | `{ update }` (base64) | "Here is one new incremental change." |
| `awareness` | steady state | `{ payload }` (base64) | Presence/cursor — relayed, NEVER applied to the doc. |

## The handshake

```
client                         server (authoritative Y.Doc)
  |  --- sync1(sv=∅) --------->  |
  |  <-- sync2(delta=full) ----  |   server sends everything the client lacks
  |  (apply delta; now synced)   |
  |  --- sync1(sv) ----------->  |   (both sides sync; server also learns what the client has)
  |  <-- sync2(delta) ---------  |
  |                              |
  |  --- update(Δ) ----------->  |   every local edit relays as an incremental update
  |  <-- update(Δ') -----------  |   every other client's edit arrives the same way
```

## Why it's efficient

You send a **state vector** (a compact "version summary per client"), and the peer replies with **only the
operations you're missing** — never the whole document. This is exactly crdt-101's "diff two replicas,"
generalized: Yjs's structure lets the peer compute the delta from your state vector alone.

## Why order & duplicates don't matter

Every payload is a Yjs update; Yjs merges are **commutative and idempotent** (the property crdt-101's fuzzer
taught us to demand). So messages can arrive reordered or duplicated and the document still converges. This
is why the reconnect-gap fix (buffer updates that arrive mid-handshake, then apply them) is *safe* — it
doesn't matter that the gap update applies before or after the sync delta.

## The reconnect gap (in-PR arc, S07)

The bug: on (re)connect a naive provider attaches its live update listener and processes/ignores incoming
updates *while the handshake is still in flight*, silently dropping any update that lands in the window
between "I asked to sync" and "I finished syncing."

The fix — **sync fully, then attach**:
1. Send `sync1`; mark `synced = false`.
2. Any `update` that arrives before sync completes → **buffer it** (do not drop).
3. On `sync2`, apply the delta, then apply the buffered gap updates, set `synced = true`.
4. Only now attach the live local-update relay.

🔗 The exact bootstrap-gap race from Tracer S6, CRDT-shaped. `provider.test.ts` reproduces it deterministically.

## Awareness (presence/cursors)

A separate ephemeral channel. Presence state (name, colour, cursor) is broadcast to peers and auto-expires
on disconnect. It **never enters the Y.Doc update log** — putting a cursor in the durable, replicated,
forever-growing document would be the S04 state-classification mistake at the network layer.
