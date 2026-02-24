// Tool Usage Frequency - Phase 4.2
export interface ToolUsage {
  tool: string;
  count: number;
  avgDurationMs: number;
  successRate: number;
  lastUsed: Date;
}

export class ToolMetricsCollector {
  private usage: Map<string, { count: number; totalMs: number; successes: number; lastUsed: Date }> = new Map();
  
  record(tool: string, durationMs: number, success: boolean): void {
    const existing = this.usage.get(tool) || { count: 0, totalMs: 0, successes: 0, lastUsed: new Date() };
    existing.count++;
    existing.totalMs += durationMs;
    if (success) existing.successes++;
    existing.lastUsed = new Date();
    this.usage.set(tool, existing);
  }
  
  getAll(): ToolUsage[] {
    return Array.from(this.usage.entries()).map(([tool, data]) => ({
      tool, count: data.count, avgDurationMs: data.totalMs / data.count,
      successRate: data.successes / data.count, lastUsed: data.lastUsed,
    }));
  }
}
