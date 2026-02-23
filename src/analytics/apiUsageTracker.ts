import { EventEmitter } from "events";

export interface APIUsageRecord {
  id: string;
  provider: string;
  model: string;
  endpoint: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latencyMs: number;
  success: boolean;
  error?: string;
  timestamp: Date;
  userId?: string;
}

export interface ProviderStats {
  provider: string;
  totalRequests: number;
  successRate: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  models: Map<string, ModelStats>;
}

export interface ModelStats {
  model: string;
  requests: number;
  tokens: number;
  cost: number;
  avgLatency: number;
}

const COST_PER_TOKEN: Record<string, { input: number; output: number }> = {
  "claude-3.5-sonnet": { input: 0.000003, output: 0.000015 },
  "claude-3-opus": { input: 0.000015, output: 0.000075 },
  "gpt-4o": { input: 0.000005, output: 0.000015 },
  "gpt-4o-mini": { input: 0.00000015, output: 0.0000006 },
  "gemini-pro": { input: 0.00000025, output: 0.0000005 },
  "gemini-1.5-flash": { input: 0.0000000375, output: 0.00000015 },
  "perplexity-sonar": { input: 0.000001, output: 0.000001 },
};

export class APIUsageTracker extends EventEmitter {
  private records: APIUsageRecord[] = [];
  private maxRecords: number = 50000;
  private dailyBudget: number = 10.0;
  private monthlyBudget: number = 200.0;

  constructor() {
    super();
  }

  track(provider: string, model: string, endpoint: string, inputTokens: number, outputTokens: number, latencyMs: number, success: boolean, error?: string): APIUsageRecord {
    const costInfo = COST_PER_TOKEN[model] || { input: 0.000001, output: 0.000001 };
    const cost = (inputTokens * costInfo.input) + (outputTokens * costInfo.output);
    const record: APIUsageRecord = {
      id: "usage_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      provider, model, endpoint, inputTokens, outputTokens,
      cost, latencyMs, success, error, timestamp: new Date(),
    };
    this.records.push(record);
    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(-this.maxRecords);
    }
    this.emit("usage", record);
    this.checkBudgetAlerts(record);
    return record;
  }

  private checkBudgetAlerts(record: APIUsageRecord): void {
    const dailyCost = this.getDailyCost();
    const monthlyCost = this.getMonthlyCost();
    if (dailyCost > this.dailyBudget * 0.8) {
      this.emit("budgetWarning", { type: "daily", used: dailyCost, budget: this.dailyBudget });
    }
    if (monthlyCost > this.monthlyBudget * 0.8) {
      this.emit("budgetWarning", { type: "monthly", used: monthlyCost, budget: this.monthlyBudget });
    }
  }

  getDailyCost(date?: Date): number {
    const target = date || new Date();
    const dayStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    return this.records
      .filter(r => r.timestamp >= dayStart)
      .reduce((sum, r) => sum + r.cost, 0);
  }

  getMonthlyCost(date?: Date): number {
    const target = date || new Date();
    const monthStart = new Date(target.getFullYear(), target.getMonth(), 1);
    return this.records
      .filter(r => r.timestamp >= monthStart)
      .reduce((sum, r) => sum + r.cost, 0);
  }

  getProviderStats(timeRange?: { start: Date; end: Date }): ProviderStats[] {
    let filtered = this.records;
    if (timeRange) {
      filtered = filtered.filter(r => r.timestamp >= timeRange.start && r.timestamp <= timeRange.end);
    }
    const providerMap = new Map<string, APIUsageRecord[]>();
    filtered.forEach(r => {
      const arr = providerMap.get(r.provider) || [];
      arr.push(r);
      providerMap.set(r.provider, arr);
    });
    const stats: ProviderStats[] = [];
    providerMap.forEach((records, provider) => {
      const models = new Map<string, ModelStats>();
      records.forEach(r => {
        const ms = models.get(r.model) || { model: r.model, requests: 0, tokens: 0, cost: 0, avgLatency: 0 };
        ms.requests++;
        ms.tokens += r.inputTokens + r.outputTokens;
        ms.cost += r.cost;
        ms.avgLatency = ((ms.avgLatency * (ms.requests - 1)) + r.latencyMs) / ms.requests;
        models.set(r.model, ms);
      });
      stats.push({
        provider,
        totalRequests: records.length,
        successRate: records.filter(r => r.success).length / records.length,
        totalTokens: records.reduce((s, r) => s + r.inputTokens + r.outputTokens, 0),
        totalCost: records.reduce((s, r) => s + r.cost, 0),
        avgLatency: records.reduce((s, r) => s + r.latencyMs, 0) / records.length,
        models,
      });
    });
    return stats;
  }

  getHourlyBreakdown(hours: number = 24): { hour: string; requests: number; cost: number }[] {
    const result: { hour: string; requests: number; cost: number }[] = [];
    const now = new Date();
    for (let i = hours - 1; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - i * 3600000);
      const hourEnd = new Date(hourStart.getTime() + 3600000);
      const hourRecords = this.records.filter(r => r.timestamp >= hourStart && r.timestamp < hourEnd);
      result.push({
        hour: hourStart.toISOString().slice(11, 16),
        requests: hourRecords.length,
        cost: hourRecords.reduce((s, r) => s + r.cost, 0),
      });
    }
    return result;
  }

  getTotalStats(): { requests: number; tokens: number; cost: number; avgLatency: number; successRate: number } {
    if (this.records.length === 0) return { requests: 0, tokens: 0, cost: 0, avgLatency: 0, successRate: 1 };
    return {
      requests: this.records.length,
      tokens: this.records.reduce((s, r) => s + r.inputTokens + r.outputTokens, 0),
      cost: this.records.reduce((s, r) => s + r.cost, 0),
      avgLatency: this.records.reduce((s, r) => s + r.latencyMs, 0) / this.records.length,
      successRate: this.records.filter(r => r.success).length / this.records.length,
    };
  }

  setBudgets(daily: number, monthly: number): void {
    this.dailyBudget = daily;
    this.monthlyBudget = monthly;
  }

  getRecords(limit?: number): APIUsageRecord[] {
    return limit ? this.records.slice(-limit) : [...this.records];
  }
}

export const apiUsageTracker = new APIUsageTracker();
