import { describe, it, expect } from "vitest";
import {
  MemoryStorage,
  assertUploadAllowed,
  isAllowedImageType,
  keyForUpload,
  UploadRejected,
  MAX_UPLOAD_BYTES,
} from "./index";

describe("StorageService validation (S04, ported from Meridian)", () => {
  it("accepts allowed image types", () => {
    expect(isAllowedImageType("image/png")).toBe(true);
    expect(isAllowedImageType("image/webp")).toBe(true);
    expect(isAllowedImageType("application/pdf")).toBe(false);
  });

  it("rejects unsupported types before touching storage", () => {
    expect(() => assertUploadAllowed("application/zip", 10)).toThrowError(UploadRejected);
    try {
      assertUploadAllowed("application/zip", 10);
    } catch (e) {
      expect((e as UploadRejected).code).toBe("UNSUPPORTED_TYPE");
    }
  });

  it("rejects oversize uploads", () => {
    try {
      assertUploadAllowed("image/png", MAX_UPLOAD_BYTES + 1);
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as UploadRejected).code).toBe("TOO_LARGE");
    }
  });

  it("generates safe, collision-resistant keys with no user input in the path", () => {
    const k1 = keyForUpload("image/png", () => 0.1);
    const k2 = keyForUpload("image/png", () => 0.9);
    expect(k1).toMatch(/^uploads\/[0-9a-z]+-[0-9a-f]{8}\.png$/);
    expect(k1).not.toBe(k2);
  });
});

describe("MemoryStorage backend", () => {
  it("stores bytes and returns a fetchable URL", async () => {
    const storage = new MemoryStorage("http://x/blob");
    const url = await storage.put("uploads/a.png", new Uint8Array([1, 2, 3]), "image/png");
    expect(url).toBe("http://x/blob/uploads/a.png");
    expect(storage.get("uploads/a.png")?.contentType).toBe("image/png");
  });

  it("url() is stable and matches put()", async () => {
    const storage = new MemoryStorage();
    const url = await storage.put("uploads/b.webp", new Uint8Array(), "image/webp");
    expect(url).toBe(storage.url("uploads/b.webp"));
  });
});
