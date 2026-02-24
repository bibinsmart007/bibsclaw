// Task Execution Metrics - Phase 4.2
export interface TaskMetric {
  taskId: string;
  name: string;
  status: 'success' | 'failure' | 'timeout';
  durationMs: number;
  retries: number;
  executedAt: Date;
}

export class TaskMetricsCollector {
  private metrics: TaskMetric[] = [];
  
  record(metric: TaskMetric): void { this.metrics.push(metric); }
  
  getSuccessRate(days?: number): number {
    const cutoff = days ? new Date(Date.now() - days * 86400000) : new Date(0);
    const filtered = this.metrics.filter(m => m.executedAt >= cutoff);
    if (filtered.length === 0) return 0;
    return filtered.filter(m => m.status === 'success').length / filtered.length;
  }
  
  getFailureRate(days?: number): number { return 1 - this.getSuccessRate(days); }
  getAll(): TaskMetric[] { return [...this.metrics]; }
}
