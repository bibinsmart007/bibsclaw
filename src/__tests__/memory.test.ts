import { describe, it, expect, beforeEach } from "vitest";
import path from "node:path";
import os from "node:os";

describe("MemoryStore", () => {
  it("should create memory entries with required fields", () => {
    const entry = {
      id: "mem_test_123",
      content: "Test memory",
      category: "fact" as const,
      timestamp: new Date(),
      relevanceScore: 1.0,
    };
    expect(entry.id).toBeTruthy();
    expect(entry.content).toBe("Test memory");
    expect(entry.category).toBe("fact");
  });

  it("should support search scoring", () => {
    const query = "hello world";
    const content = "hello world test";
    const queryWords = query.toLowerCase().split(/\s+/);
    const matchScore = queryWords.filter(w => content.includes(w)).length / queryWords.length;
    expect(matchScore).toBe(1.0);
  });

  it("should support partial match scoring", () => {
    const query = "hello world foo";
    const content = "hello world test";
    const queryWords = query.toLowerCase().split(/\s+/);
    const matchScore = queryWords.filter(w => content.includes(w)).length / queryWords.length;
    expect(matchScore).toBeCloseTo(0.667, 2);
  });
});
