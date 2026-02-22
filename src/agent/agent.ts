import Anthropic from "@anthropic-ai/sdk";
import { appConfig } from "../config.js";
import { executeTool, toolDefinitions, type ToolResult } from "./tools.js";
import { EventEmitter } from "node:events";

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolsUsed?: string[];
}

export interface AgentEvents {
  message: (msg: AgentMessage) => void;
  thinking: (text: string) => void;
  toolCall: (name: string, input: any) => void;
  toolResult: (name: string, result: ToolResult) => void;
  error: (error: Error) => void;
  done: () => void;
}

export class BibsClawAgent extends EventEmitter {
  private anthropicClient: Anthropic | null = null;
  private conversationHistory: any[] = [];
  private perplexityHistory: { role: string; content: string }[] = [];
  private systemPrompt: string;
  private isRunning = false;

  constructor() {
    super();
    if (appConfig.ai.anthropicApiKey) {
      this.anthropicClient = new Anthropic({ apiKey: appConfig.ai.anthropicApiKey });
    }
    this.systemPrompt = this.buildSystemPrompt();
  }

  private buildSystemPrompt(): string {
    return `You are BibsClaw, Bibin's personal AI assistant built with love.
You are helpful, friendly, and always ready to chat.

You can:
- Answer questions on any topic
- Search the web for current information
- Help with coding, writing, and creative tasks
- Have natural conversations
- Help manage projects and automation

You are working in project directory: ${appConfig.project.dir}

Be concise, direct, and helpful. You are Bibin's trusted AI partner.
Always respond warmly and helpfully to any message, including greetings like "hello".
Never refuse to respond. Always engage with the user.`;
  }

  async chat(userMessage: string): Promise<string> {
    if (this.isRunning) {
      return "I'm already working on something. Please wait.";
    }

    this.isRunning = true;

    this.emit("message", {
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    } as AgentMessage);

    try {
      let finalResponse = "";

      if (appConfig.ai.provider === "perplexity") {
        finalResponse = await this.chatWithPerplexity(userMessage);
      } else if (this.anthropicClient) {
        finalResponse = await this.chatWithAnthropic(userMessage);
      } else {
        finalResponse = "No AI provider configured. Please set PERPLEXITY_API_KEY or ANTHROPIC_API_KEY in your .env file.";
      }

      this.emit("message", {
        role: "assistant",
        content: finalResponse,
        timestamp: new Date(),
      } as AgentMessage);

      this.emit("done");
      return finalResponse;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.emit("error", error);
      return `Error: ${error.message}`;
    } finally {
      this.isRunning = false;
    }
  }

  private async chatWithPerplexity(userMessage: string): Promise<string> {
    this.emit("thinking", "Thinking with Perplexity...");

    this.perplexityHistory.push({ role: "user", content: userMessage });

    // Keep only last 20 messages to avoid token limits
    if (this.perplexityHistory.length > 20) {
      this.perplexityHistory = this.perplexityHistory.slice(-20);
    }

    const messages = [
      { role: "system", content: this.systemPrompt },
      ...this.perplexityHistory,
    ];

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${appConfig.ai.perplexityApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: appConfig.ai.perplexityModel,
        messages,
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as any;
    const assistantMessage = data.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.";

    this.perplexityHistory.push({ role: "assistant", content: assistantMessage });

    return assistantMessage;
  }

  private async chatWithAnthropic(userMessage: string): Promise<string> {
    if (!this.anthropicClient) {
      throw new Error("Anthropic client not initialized");
    }

    this.conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    let finalResponse = "";
    let iterationCount = 0;
    const maxIterations = 25;

    while (iterationCount < maxIterations) {
      iterationCount++;
      this.emit("thinking", `Thinking... (step ${iterationCount})`);

      const response = await this.anthropicClient.messages.create({
        model: appConfig.ai.anthropicModel,
        max_tokens: 8192,
        system: this.systemPrompt,
        tools: toolDefinitions as any,
        messages: this.conversationHistory,
      });

      if (response.stop_reason === "end_turn") {
        const textBlocks = response.content.filter(
          (block) => block.type === "text"
        );
        finalResponse = textBlocks
          .map((b) => (b as Anthropic.TextBlock).text)
          .join("\n");

        this.conversationHistory.push({
          role: "assistant",
          content: response.content,
        });
        break;
      }

      if (response.stop_reason === "tool_use") {
        this.conversationHistory.push({
          role: "assistant",
          content: response.content,
        });

        const toolUseBlocks = response.content.filter(
          (block) => block.type === "tool_use"
        ) as Anthropic.ToolUseBlock[];

        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const toolUse of toolUseBlocks) {
          this.emit("toolCall", toolUse.name, toolUse.input);

          const result = await executeTool(
            toolUse.name,
            toolUse.input as Record<string, string>
          );
          this.emit("toolResult", toolUse.name, result);

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: result.success
              ? result.output
              : `ERROR: ${result.error}`,
            is_error: !result.success,
          });
        }

        this.conversationHistory.push({
          role: "user",
          content: toolResults,
        });
      }
    }

    if (iterationCount >= maxIterations) {
      finalResponse +=
        "\n\n(Reached maximum iteration limit. Some work may be incomplete.)";
    }

    return finalResponse;
  }

  clearHistory(): void {
    this.conversationHistory = [];
    this.perplexityHistory = [];
  }

  getHistory(): AgentMessage[] {
    if (appConfig.ai.provider === "perplexity") {
      return this.perplexityHistory
        .filter((msg) => typeof msg.content === "string")
        .map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
          timestamp: new Date(),
        }));
    }
    return this.conversationHistory
      .filter((msg) => typeof msg.content === "string")
      .map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content as string,
        timestamp: new Date(),
      }));
  }

  get busy(): boolean {
    return this.isRunning;
  }
}
