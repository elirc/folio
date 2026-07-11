/**
 * Search (S14). The FTS index lives in Postgres; these are the pure pieces around it: snippet extraction and
 * — critically — PERMISSION SCOPING of results.
 *
 * ⚠️ THE CLASSIC SEARCH LEAK. A search index is a permission bypass waiting to happen: the naive query
 * returns hits (and snippets!) from every document containing the term, including ones the searcher can't
 * read. Scope results at query time using the effective-permission resolver (S11). Forgetting this leaks
 * document *content* through search snippets — one of the most common real-world access-control bugs.
 */
export interface SearchHit {
  nodeId: string;
  title: string;
  snippet: string;
}

/** Keep only hits the viewer can actually read. `canView(nodeId)` uses S11's effective-role resolution. */
export function scopeSearchResults(hits: readonly SearchHit[], canView: (nodeId: string) => boolean): SearchHit[] {
  return hits.filter((h) => canView(h.nodeId));
}

/**
 * A snippet centred on the first case-insensitive match of `query` in `text`, with `radius` chars each side
 * and ellipses. Returns a leading slice if there's no match (so a title-only hit still shows context).
 */
export function makeSnippet(text: string, query: string, radius = 40): string {
  const q = query.trim();
  const idx = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (idx === -1) {
    const head = text.slice(0, radius * 2).trim();
    return head.length < text.length ? head + "…" : head;
  }
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + q.length + radius);
  return (start > 0 ? "…" : "") + text.slice(start, end).trim() + (end < text.length ? "…" : "");
}
