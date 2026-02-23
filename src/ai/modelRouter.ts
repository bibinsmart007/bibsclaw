import { appConfig } from "../config.js";
import { EventEmitter } from "node:events";

export interface ModelProvider {
  name: string;
  enabled: boolean;
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
  estimateCost(inputTokens: number, outputTokens: number): number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface RoutingResult {
  provider: string;
  model: string;
  response: string;
  latencyMs: number;
  estimatedCost: number;
}

export class ModelRouter extends EventEmitter {
  private providers: Map<string, ModelProvider> = new Map();
  private fallbackChain: string[] = [];
  private costLog: { provider: string; cost: number; timestamp: Date }[] = [];

  registerProvider(provider: ModelProvider): void {
    this.providers.set(provider.name, provider);
    if (provider.enabled) {
      this.fallbackChain.push(provider.name);
    }
  }

  setFallbackChain(chain: string[]): void {
    this.fallbackChain = chain.filter(n => this.providers.has(n));
  }

  async route(messages: ChatMessage[], options?: ChatOptions): Promise<RoutingResult> {
    const complexity = this.estimateComplexity(messages);
    const preferredProvider = this.selectProvider(complexity);
    const chain = [preferredProvider, ...this.fallbackChain.filter(p => p !== preferredProvider)];

    for (const providerName of chain) {
      const provider = this.providers.get(providerName);
      if (!provider || !provider.enabled) continue;

      try {
        const start = Date.now();
        const response = await provider.chat(messages, options);
        const latencyMs = Date.now() - start;
        const cost = provider.estimateCost(this.countTokens(messages), response.length / 4);
        this.costLog.push({ provider: providerName, cost, timestamp: new Date() });
        this.emit("routed", { provider: providerName, latencyMs, cost });
        return { provider: providerName, model: options?.model || "default", response, latencyMs, estimatedCost: cost };
      } catch (err) {
        this.emit("fallback", { from: providerName, error: String(err) });
        continue;
      }
    }
    throw new Error("All AI providers failed");
  }

  async compareModels(messages: ChatMessage[], providerNames?: string[]): Promise<RoutingResult[]> {
    const names = providerNames || Array.from(this.providers.keys());
    const results: RoutingResult[] = [];
    for (const name of names) {
      try {
        const result = await this.route(messages, { model: name });
        results.push(result);
      } catch { /* skip failed */ }
    }
    return results;
  }

  private estimateComplexity(messages: ChatMessage[]): "low" | "medium" | "high" {
    const totalLength = messages.reduce((sum, m) => sum + m.content.length, 0);
    const lastMsg = messages[messages.length - 1]?.content || "";
    const hasCode = /```|function |class |import |const |let /.test(lastMsg);
    const hasAnalysis = /analyze|explain|compare|summarize|review/.test(lastMsg.toLowerCase());
    if (totalLength > 5000 || hasCode || hasAnalysis) return "high";
    if (totalLength > 1000) return "medium";
    return "low";
  }

  private selectProvider(complexity: string): string {
    if (complexity === "low" && this.providers.has("perplexity")) return "perplexity";
    if (complexity === "high" && this.providers.has("anthropic")) return "anthropic";
    return this.fallbackChain[0] || "perplexity";
  }

  private countTokens(messages: ChatMessage[]): number {
    return messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
  }

  getCostSummary(): { total: number; byProvider: Record<string, number> } {
    const byProvider: Record<string, number> = {};
    let total = 0;
    for (const entry of this.costLog) {
      byProvider[entry.provider] = (byProvider[entry.provider] || 0) + entry.cost;
      total += entry.cost;
    }
    return { total, byProvider };
  }

  getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }

  isProviderEnabled(name: string): boolean {
    return this.providers.get(name)?.enabled || false;
  }
}
