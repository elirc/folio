const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001";
export const WS_URL = (import.meta.env.VITE_WS_URL as string | undefined) ?? "ws://localhost:3001/ws";

// S02: single-workspace demo. Real workspace switching is out of scope for the capstone's teaching arc.
export const WORKSPACE_ID = (import.meta.env.VITE_WORKSPACE_ID as string | undefined) ?? "demo-ws";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

type Method = "POST" | "PUT" | "PATCH" | "DELETE";

export async function apiSend<T>(path: string, method: Method, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  // 204 (delete) has no body.
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
