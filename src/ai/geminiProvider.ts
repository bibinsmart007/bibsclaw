import type { ModelProvider, ChatMessage, ChatOptions } from "./modelRouter.js";
import { appConfig } from "../config.js";

export class GeminiProvider implements ModelProvider {
  name = "gemini";
  get enabled(): boolean {
    return (appConfig.ai as any).geminiApiKey?.length > 0;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    const apiKey = (appConfig.ai as any).geminiApiKey;
    if (!apiKey) throw new Error("Gemini API key not configured");
    const model = (appConfig.ai as any).geminiModel || "gemini-2.0-flash";
    const contents = messages.filter(m => m.role !== "system").map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const systemInstruction = messages.find(m => m.role === "system")?.content;
    const body: any = { contents, generationConfig: { maxOutputTokens: options?.maxTokens || 4096, temperature: options?.temperature || 0.7 } };
    if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Gemini API error (${res.status}): ${await res.text()}`);
    const data = await res.json() as any;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini";
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    return (inputTokens * 0.000000075) + (outputTokens * 0.0000003);
  }
}
