// Usage Quotas - Phase 4
// Manages API usage limits and quota tracking

export interface QuotaPlan {
  id: string;
  name: string;
  limits: QuotaLimits;
}

export interface QuotaLimits {
  apiCallsPerDay: number;
  apiCallsPerMonth: number;
  storageBytes: number;
  maxTasks: number;
  maxExports: number;
}

export interface UsageRecord {
  userId: string;
  planId: string;
  period: string;
  apiCalls: number;
  storageUsed: number;
  tasksCreated: number;
  exportsUsed: number;
  lastUpdated: Date;
}

export class UsageQuotaManager {
  private plans: Map<string, QuotaPlan> = new Map();
  private usage: Map<string, UsageRecord> = new Map();

  registerPlan(plan: QuotaPlan): void {
    this.plans.set(plan.id, plan);
  }

  async checkQuota(userId: string, resource: keyof QuotaLimits): Promise<{ allowed: boolean; remaining: number }> {
    const record = this.usage.get(userId);
    if (!record) return { allowed: true, remaining: Infinity };
    const plan = this.plans.get(record.planId);
    if (!plan) return { allowed: true, remaining: Infinity };
    const limit = plan.limits[resource] as number;
    let used = 0;
    switch (resource) {
      case "apiCallsPerDay":
      case "apiCallsPerMonth":
        used = record.apiCalls;
        break;
      case "storageBytes":
        used = record.storageUsed;
        break;
      case "maxTasks":
        used = record.tasksCreated;
        break;
      case "maxExports":
        used = record.exportsUsed;
        break;
    }
    return { allowed: used < limit, remaining: Math.max(0, limit - used) };
  }

  async incrementUsage(userId: string, resource: string, amount: number = 1): Promise<void> {
    let record = this.usage.get(userId);
    if (!record) {
      record = {
        userId,
        planId: "free",
        period: new Date().toISOString().slice(0, 7),
        apiCalls: 0,
        storageUsed: 0,
        tasksCreated: 0,
        exportsUsed: 0,
        lastUpdated: new Date(),
      };
      this.usage.set(userId, record);
    }
    switch (resource) {
      case "apiCalls":
        record.apiCalls += amount;
        break;
      case "storage":
        record.storageUsed += amount;
        break;
      case "tasks":
        record.tasksCreated += amount;
        break;
      case "exports":
        record.exportsUsed += amount;
        break;
    }
    record.lastUpdated = new Date();
  }

  async getUsage(userId: string): Promise<UsageRecord | undefined> {
    return this.usage.get(userId);
  }

  async resetUsage(userId: string): Promise<void> {
    this.usage.delete(userId);
  }
}
