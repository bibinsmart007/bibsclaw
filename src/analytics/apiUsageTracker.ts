// API Usage & Cost Tracker - Phase 4.2
export interface ApiUsageRecord {
  provider: string;
  model: string;
  tokens: { input: number; output: number };
  cost: number;
  latencyMs: number;
  timestamp: Date;
  success: boolean;
}

export class ApiUsageTracker {
  private records: ApiUsageRecord[] = [];
  
  track(record: ApiUsageRecord): void { this.records.push(record); }
  
  getCostByProvider(days?: number): Record<string, number> {
    const cutoff = days ? new Date(Date.now() - days * 86400000) : new Date(0);
    const result: Record<string, number> = {};
    this.records.filter(r => r.timestamp >= cutoff).forEach(r => {
      result[r.provider] = (result[r.provider] || 0) + r.cost;
    });
    return result;
  }
  
  getTotalCost(days?: number): number {
    return Object.values(this.getCostByProvider(days)).reduce((a, b) => a + b, 0);
  }
  
  getRecords(): ApiUsageRecord[] { return [...this.records]; }
}
