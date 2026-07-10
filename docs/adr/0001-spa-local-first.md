# ADR-0001: A local-first React SPA (the editor is the app)

- **Status:** Accepted
- **Date:** 2026-07-10
- **Sprint:** S01
- **Deciders:** Folio authors

## Context
Folio is a rich-text editor with real-time collaboration, offline editing, and presence. The client isn't
a thin view over server-rendered pages — it holds a live, mutating document model, a WebSocket to peers,
and (from S08) an offline replica. The frontend *is* the product.

## Decision
A **React + Vite single-page app**, local-first. The document lives in the client (a CRDT replica by S07),
edits apply optimistically to the local model, and the network syncs replicas. The API is a thin
persistence + WebSocket-relay surface, not a page renderer.

## Alternatives considered
- **Server-rendered / Next.js.** Great for content sites and SEO, but Folio has no SEO surface behind auth
  and no page-navigation model — it's one long-lived editing session. SSR would add a hydration boundary
  around a fundamentally client-owned document for no benefit. (🔗 The same call Tracer made, for the same
  reason: a local-first collaborative app is client-owned.)
- **A framework meta-app (Remix/Next) for routing.** The routing surface is tiny (workspace → doc tree →
  doc); a lightweight client router suffices without a server framework's weight.

## Consequences
- The client carries real complexity (the CRDT replica, presence, offline store) — appropriate, because
  that complexity *is* the domain.
- The API stays small and boring, which is what you want under a collaborative editor: a durable relay,
  not a render tier.
- Vite gives fast local dev; the build is a static bundle served anywhere.

## Links
- `apps/web`, `apps/api`, ADR-0002 (the CRDT roadmap), `docs/sprints/sprint-01.md`
