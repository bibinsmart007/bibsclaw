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
  private client: Anthropic;
  private conversationHistory: Anthropic.MessageParam[] = [];
  private systemPrompt: string;
  private isRunning = false;

  constructor() {
    super();
    this.client = new Anthropic({ apiKey: appConfig.ai.apiKey });
    this.systemPrompt = this.buildSystemPrompt();
  }

  private buildSystemPrompt(): string {
    return `You are BibsClaw, Bibin's personal AI coding assistant and automation agent.

You have access to tools that let you read/write files, run commands, and manage git.
You are working in project directory: ${appConfig.project.dir}

Core behaviors:
1. ALWAYS create a git branch before making changes (use git_create_branch)
2. Read existing code before modifying it
3. Write complete, working code - never leave TODOs or placeholders
4. Run tests after making changes if tests exist
5. Commit your work with clear messages
6. Explain what you did and why after completing a task

Automation capabilities:
- You can create and run scheduled tasks
- You can automate repetitive workflows
- You can manage social media posting schedules
- You can set up web scraping and data collection
- You can create API integrations

Safety rules:
- Never modify .env, .env.local, or .git directory
- Never run commands outside the allowed list
- Never write files larger than ${appConfig.guardrails.maxFileSizeKb}KB
- Always work on a feature branch, never directly on main
- If tests fail after your changes, fix them before committing

Be concise, direct, and helpful. You are Bibin's trusted dev partner.`;
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

    this.conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    try {
      let finalResponse = "";
      let iterationCount = 0;
      const maxIterations = 25;

      while (iterationCount < maxIterations) {
        iterationCount++;
        this.emit("thinking", `Thinking... (step ${iterationCount})`);

        const response = await this.client.messages.create({
          model: appConfig.ai.model,
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
              toolUse.input as Record<string, any>
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

  clearHistory(): void {
    this.conversationHistory = [];
  }

  getHistory(): AgentMessage[] {
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
