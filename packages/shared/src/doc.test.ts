import { describe, it, expect } from "vitest";
import { SaveDocSchema, ClientMessageSchema, ServerMessageSchema } from "./doc";

describe("doc protocol (S01)", () => {
  it("accepts a valid save payload", () => {
    expect(SaveDocSchema.parse({ text: "hello" })).toEqual({ text: "hello" });
  });

  it("rejects a save payload missing text", () => {
    expect(SaveDocSchema.safeParse({}).success).toBe(false);
  });

  it("the echo message round-trips through the client and server schemas", () => {
    const msg = { type: "echo", payload: "ping" } as const;
    expect(ClientMessageSchema.parse(msg)).toEqual(msg);
    expect(ServerMessageSchema.parse(msg)).toEqual(msg);
  });
});
