import { describe, it, expect } from "vitest";
import { SaveDocSchema, ClientMessageSchema, ServerMessageSchema } from "./doc";

describe("doc protocol", () => {
  it("accepts a valid save payload", () => {
    expect(SaveDocSchema.parse({ text: "hello" })).toEqual({ text: "hello" });
  });

  it("rejects a save payload missing text", () => {
    expect(SaveDocSchema.safeParse({}).success).toBe(false);
  });

  it("parses a join message (client → server)", () => {
    const msg = { type: "join", docId: "d1", user: { id: "u1", name: "Ann", color: "#f00" } } as const;
    expect(ClientMessageSchema.parse(msg)).toEqual(msg);
  });

  it("parses a whole-doc update in both directions (S05 naive sync)", () => {
    const msg = { type: "doc_update", docId: "d1", rev: 2, doc: { type: "doc", content: [] } };
    expect(ClientMessageSchema.parse(msg)).toMatchObject({ type: "doc_update", rev: 2 });
    expect(ServerMessageSchema.parse(msg)).toMatchObject({ type: "doc_update", rev: 2 });
  });

  it("presence is a server-authored message", () => {
    const msg = { type: "presence", docId: "d1", users: [{ id: "u1", name: "Ann", color: "#f00" }] };
    expect(ServerMessageSchema.parse(msg)).toMatchObject({ type: "presence" });
    // ...and not something a client sends
    expect(ClientMessageSchema.safeParse(msg).success).toBe(false);
  });

  it("a cursor carries absolute offsets (the S05 naïveté S09 fixes)", () => {
    const msg = { type: "cursor", docId: "d1", user: { id: "u1", name: "Ann", color: "#f00" }, anchor: 3, head: 5 };
    expect(ClientMessageSchema.parse(msg)).toMatchObject({ anchor: 3, head: 5 });
  });
});
