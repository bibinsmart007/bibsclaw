import type { ModelProvider, ChatMessage, ChatOptions } from "./modelRouter.js";
import { appConfig } from "../config.js";

export class PerplexityProvider implements ModelProvider {
  name = "perplexity";
  get enabled(): boolean {
    return appConfig.ai.perplexityApiKey.length > 0;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${appConfig.ai.perplexityApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: appConfig.ai.perplexityModel,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature || 0.7,
      }),
    });
    if (!res.ok) throw new Error(`Perplexity API error (${res.status}): ${await res.text()}`);
    const data = await res.json() as any;
    return data.choices?.[0]?.message?.content || "No response from Perplexity";
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    return (inputTokens * 0.0000001) + (outputTokens * 0.0000004);
  }
}
