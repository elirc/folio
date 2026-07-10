/**
 * StorageService (S04) — 🔗 PORTED from Meridian S4. This is the learner's fourth encounter with the same
 * abstraction (blob storage behind an interface), and porting your own prior abstraction *is* the reuse
 * lesson made literal: the interface is stable, only the backing store changes per app.
 *
 * The interface hides WHERE bytes live (memory in tests, disk in dev, S3/R2 in prod) behind `put`/`url`.
 * The editor and API depend only on the interface, so swapping the backend never touches call sites.
 */
export interface StorageService {
  /** Store bytes under a content-addressed-ish key; return the public URL to fetch them. */
  put(key: string, data: Uint8Array, contentType: string): Promise<string>;
  /** The public URL for a key (without storing). */
  url(key: string): string;
}

/** Images we accept (S04). Enforced at the upload edge; alt-text a11y is enforced later (S14). */
export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export function isAllowedImageType(contentType: string): contentType is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(contentType);
}

/** Validate an upload before it touches storage. Throws a typed error the API maps to a 4xx. */
export class UploadRejected extends Error {
  constructor(
    public readonly code: "UNSUPPORTED_TYPE" | "TOO_LARGE",
    message: string,
  ) {
    super(message);
    this.name = "UploadRejected";
  }
}

export function assertUploadAllowed(contentType: string, byteLength: number): void {
  if (!isAllowedImageType(contentType)) {
    throw new UploadRejected("UNSUPPORTED_TYPE", `unsupported content type: ${contentType}`);
  }
  if (byteLength > MAX_UPLOAD_BYTES) {
    throw new UploadRejected("TOO_LARGE", `upload exceeds ${MAX_UPLOAD_BYTES} bytes`);
  }
}

const EXT: Record<AllowedImageType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

/** A collision-resistant storage key: a random prefix + a safe extension. No user input in the path. */
export function keyForUpload(contentType: AllowedImageType, rng: () => number = Math.random): string {
  const rand = Math.floor(rng() * 0xffffffff).toString(16).padStart(8, "0");
  const stamp = Date.now().toString(36);
  return `uploads/${stamp}-${rand}.${EXT[contentType]}`;
}

/** In-memory backend for tests and local dev — the interface is what matters, not the store. */
export class MemoryStorage implements StorageService {
  private readonly blobs = new Map<string, { data: Uint8Array; contentType: string }>();
  constructor(private readonly baseUrl = "http://localhost:3001/blob") {}

  put(key: string, data: Uint8Array, contentType: string): Promise<string> {
    this.blobs.set(key, { data, contentType });
    return Promise.resolve(this.url(key));
  }

  url(key: string): string {
    return `${this.baseUrl}/${key}`;
  }

  /** Test/dev helper: read back what was stored. */
  get(key: string): { data: Uint8Array; contentType: string } | undefined {
    return this.blobs.get(key);
  }
}
