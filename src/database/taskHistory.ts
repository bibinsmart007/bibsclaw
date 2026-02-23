// Task History - Phase 1
// Tracks task execution history and results

export interface TaskRecord {
  id: string;
  taskType: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  startedAt: Date;
  completedAt: Date | null;
  duration: number;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  retryCount: number;
}

export interface TaskFilter {
  taskType?: string;
  status?: TaskRecord["status"];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export class TaskHistory {
  private records: TaskRecord[] = [];
  private maxRecords: number;

  constructor(maxRecords: number = 10000) {
    this.maxRecords = maxRecords;
  }

  async addRecord(record: TaskRecord): Promise<void> {
    this.records.push(record);
    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(-this.maxRecords);
    }
  }

  async getRecords(filter?: TaskFilter): Promise<TaskRecord[]> {
    let results = [...this.records];
    if (filter) {
      if (filter.taskType) {
        results = results.filter((r) => r.taskType === filter.taskType);
      }
      if (filter.status) {
        results = results.filter((r) => r.status === filter.status);
      }
      if (filter.startDate) {
        results = results.filter((r) => r.startedAt >= filter.startDate!);
      }
      if (filter.endDate) {
        results = results.filter((r) => r.startedAt <= filter.endDate!);
      }
      if (filter.limit) {
        results = results.slice(-filter.limit);
      }
    }
    return results;
  }

  async getStats(): Promise<{ total: number; byStatus: Record<string, number>; avgDuration: number }> {
    const byStatus: Record<string, number> = {};
    let totalDuration = 0;
    let completedCount = 0;
    for (const record of this.records) {
      byStatus[record.status] = (byStatus[record.status] || 0) + 1;
      if (record.status === "completed" && record.duration > 0) {
        totalDuration += record.duration;
        completedCount++;
      }
    }
    return {
      total: this.records.length,
      byStatus,
      avgDuration: completedCount > 0 ? totalDuration / completedCount : 0,
    };
  }

  async clearOlderThan(date: Date): Promise<number> {
    const before = this.records.length;
    this.records = this.records.filter((r) => r.startedAt >= date);
    return before - this.records.length;
  }
}
