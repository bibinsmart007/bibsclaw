import type { ModelProvider, ChatMessage, ChatOptions } from "./modelRouter.js";
import { appConfig } from "../config.js";

export class OpenAIProvider implements ModelProvider {
  name = "openai";
  get enabled(): boolean {
    return (appConfig.ai as any).openaiChatApiKey?.length > 0;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    const apiKey = (appConfig.ai as any).openaiChatApiKey || appConfig.stt.apiKey;
    if (!apiKey) throw new Error("OpenAI API key not configured");
    const model = (appConfig.ai as any).openaiModel || "gpt-4o-mini";
    const body = {
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature || 0.7,
    };
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`OpenAI API error (${res.status}): ${await res.text()}`);
    const data = await res.json() as any;
    return data.choices?.[0]?.message?.content || "No response from OpenAI";
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    return (inputTokens * 0.00000015) + (outputTokens * 0.0000006);
  }
}
