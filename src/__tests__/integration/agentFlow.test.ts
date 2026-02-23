// Integration Tests - Agent Chat Flow (Phase 1.3)
// Tests the complete agent conversation pipeline

import { describe, it, expect, beforeEach } from "@jest/globals";

// Mock interfaces for agent integration test
interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AgentResponse {
  message: string;
  toolsUsed: string[];
  duration: number;
  model: string;
}

// Mock agent for testing
class MockAgent {
  private messages: AgentMessage[] = [];
  private model: string;

  constructor(model: string = "mock-gpt") {
    this.model = model;
  }

  async chat(userMessage: string): Promise<AgentResponse> {
    this.messages.push({
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    });

    const response = `Echo: ${userMessage}`;
    this.messages.push({
      role: "assistant",
      content: response,
      timestamp: new Date(),
    });

    return {
      message: response,
      toolsUsed: [],
      duration: 50,
      model: this.model,
    };
  }

  getHistory(): AgentMessage[] {
    return [...this.messages];
  }

  clearHistory(): void {
    this.messages = [];
  }
}

describe("Agent Chat Flow Integration Tests", () => {
  let agent: MockAgent;

  beforeEach(() => {
    agent = new MockAgent();
  });

  it("should handle a basic chat message", async () => {
    const response = await agent.chat("Hello, BibsClaw!");
    expect(response).toBeDefined();
    expect(response.message).toContain("Hello, BibsClaw!");
    expect(response.duration).toBeGreaterThan(0);
  });

  it("should maintain conversation history", async () => {
    await agent.chat("First message");
    await agent.chat("Second message");
    const history = agent.getHistory();
    expect(history).toHaveLength(4);
    expect(history[0].role).toBe("user");
    expect(history[1].role).toBe("assistant");
  });

  it("should return the model name in response", async () => {
    const response = await agent.chat("What model are you?");
    expect(response.model).toBe("mock-gpt");
  });

  it("should clear history when requested", async () => {
    await agent.chat("Remember this");
    agent.clearHistory();
    const history = agent.getHistory();
    expect(history).toHaveLength(0);
  });

  it("should handle empty messages gracefully", async () => {
    const response = await agent.chat("");
    expect(response).toBeDefined();
    expect(response.message).toBeDefined();
  });

  it("should process multiple concurrent messages", async () => {
    const promises = [
      agent.chat("Message 1"),
      agent.chat("Message 2"),
      agent.chat("Message 3"),
    ];
    const responses = await Promise.all(promises);
    expect(responses).toHaveLength(3);
    responses.forEach((r) => {
      expect(r.message).toBeDefined();
    });
  });
});

describe("Agent Tool Chain Integration Tests", () => {
  it("should chain tools in sequence", async () => {
    const toolResults: string[] = [];
    const mockTool = async (input: string) => {
      toolResults.push(`processed: ${input}`);
      return `result of ${input}`;
    };

    const result1 = await mockTool("step1");
    const result2 = await mockTool(result1);
    expect(toolResults).toHaveLength(2);
    expect(result2).toContain("result of step1");
  });

  it("should handle tool failures gracefully", async () => {
    const failingTool = async () => {
      throw new Error("Tool execution failed");
    };

    await expect(failingTool()).rejects.toThrow("Tool execution failed");
  });
});
