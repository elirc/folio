import { describe, it, expect, afterAll } from "vitest";
import { buildServer } from "../server";

// The upload route uses in-memory StorageService — no DB, no disk — so it's fully exercisable in-process.
const app = buildServer();
afterAll(async () => {
  await app.close();
});

describe("POST /api/uploads (S04)", () => {
  it("stores a valid image and returns a URL", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/uploads",
      headers: { "content-type": "image/png" },
      payload: Buffer.from([0x89, 0x50, 0x4e, 0x47]), // PNG magic bytes
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.url).toMatch(/uploads\/.+\.png$/);
    expect(body.key).toMatch(/^uploads\//);
  });

  it("rejects an unsupported type with 415 (before storing)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/uploads",
      headers: { "content-type": "application/zip" },
      payload: Buffer.from([0x50, 0x4b]),
    });
    expect(res.statusCode).toBe(415);
    expect(res.json().error.code).toBe("UNSUPPORTED_TYPE");
  });
});
