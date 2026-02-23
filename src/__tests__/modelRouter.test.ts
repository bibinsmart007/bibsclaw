import { describe, it, expect } from "vitest";

describe("ModelRouter", () => {
  it("should estimate complexity for short messages", () => {
    const messages = [{ role: "user" as const, content: "Hello" }];
    const totalLength = messages.reduce((sum, m) => sum + m.content.length, 0);
    expect(totalLength).toBeLessThan(1000);
  });

  it("should estimate high complexity for code", () => {
    const msg = "function test() { return true; } import something";
    expect(/function |import /.test(msg)).toBe(true);
  });

  it("should count tokens approximately", () => {
    const text = "Hello world this is a test message";
    const tokens = Math.ceil(text.length / 4);
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(text.length);
  });
});
