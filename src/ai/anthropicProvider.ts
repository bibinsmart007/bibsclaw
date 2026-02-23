import type { ModelProvider, ChatMessage, ChatOptions } from "./modelRouter.js";
import { appConfig } from "../config.js";

export class AnthropicProvider implements ModelProvider {
  name = "anthropic";
  get enabled(): boolean {
    return appConfig.ai.anthropicApiKey.length > 0;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    const sysMsg = messages.find(m => m.role === "system")?.content || "";
    const chatMsgs = messages.filter(m => m.role !== "system").map(m => ({ role: m.role, content: m.content }));
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": appConfig.ai.anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: appConfig.ai.anthropicModel,
        max_tokens: options?.maxTokens || 4096,
        system: sysMsg,
        messages: chatMsgs,
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error (${res.status}): ${await res.text()}`);
    const data = await res.json() as any;
    return data.content?.[0]?.text || "No response from Anthropic";
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    return (inputTokens * 0.000003) + (outputTokens * 0.000015);
  }
}
