import { describe, it, expect } from "vitest";
import { EditAnnouncer, checkA11y } from "./a11y";

describe("collaborative-edit announcer (S14) — polite, focused, rate-limited", () => {
  it("only queues edits to the focused region", () => {
    const a = new EditAnnouncer(() => "block-1", 2000);
    a.observe({ author: "Ann", region: "block-1" });
    a.observe({ author: "Bob", region: "block-9" }); // elsewhere — ignored
    expect(a.poll(0)).toBe("Ann edited nearby");
  });

  it("coalesces a burst into ONE summary, not a firehose", () => {
    const a = new EditAnnouncer(() => "r", 2000);
    for (let i = 0; i < 5; i++) a.observe({ author: "Ann", region: "r" });
    expect(a.poll(0)).toBe("Ann made 5 edits nearby");
  });

  it("rate-limits: no second announcement inside the window", () => {
    const a = new EditAnnouncer(() => "r", 2000);
    a.observe({ author: "Ann", region: "r" });
    expect(a.poll(0)).toBe("Ann edited nearby");
    a.observe({ author: "Bob", region: "r" });
    expect(a.poll(1000)).toBeNull(); // still inside the 2s window
    expect(a.poll(2000)).toBe("Bob edited nearby"); // window elapsed
  });

  it("summarizes multiple authors", () => {
    const a = new EditAnnouncer(() => "r", 2000);
    a.observe({ author: "Ann", region: "r" });
    a.observe({ author: "Bob", region: "r" });
    expect(a.poll(0)).toBe("2 people made 2 edits nearby");
  });
});

describe("a11y gate — DOM-less rule checks (S14)", () => {
  it("passes clean HTML", () => {
    expect(checkA11y('<h1>T</h1><p>ok</p><img src="/a.png" alt="cat"><a href="/x">link</a>')).toEqual([]);
  });
  it("flags an image with no alt attribute", () => {
    expect(checkA11y('<img src="/a.png">').map((v) => v.rule)).toContain("img-alt");
  });
  it("flags a link with an empty href", () => {
    expect(checkA11y('<a href="">x</a>').map((v) => v.rule)).toContain("link-href");
  });
  it("flags an empty heading and a heading-level skip", () => {
    expect(checkA11y("<h1></h1>").map((v) => v.rule)).toContain("empty-heading");
    expect(checkA11y("<h1>a</h1><h3>b</h3>").map((v) => v.rule)).toContain("heading-skip");
  });
});
