// Chat Volume & Response Metrics - Phase 4.2
export interface ChatMetric {
  sessionId: string;
  messagesCount: number;
  avgResponseTimeMs: number;
  model: string;
  startedAt: Date;
  endedAt?: Date;
}

export class ChatMetricsCollector {
  private metrics: ChatMetric[] = [];
  
  record(metric: ChatMetric): void { this.metrics.push(metric); }
  
  getAverageResponseTime(days?: number): number {
    const cutoff = days ? new Date(Date.now() - days * 86400000) : new Date(0);
    const filtered = this.metrics.filter(m => m.startedAt >= cutoff);
    if (filtered.length === 0) return 0;
    return filtered.reduce((a, m) => a + m.avgResponseTimeMs, 0) / filtered.length;
  }
  
  getDailyVolume(): Record<string, number> {
    const result: Record<string, number> = {};
    this.metrics.forEach(m => {
      const day = m.startedAt.toISOString().split('T')[0];
      result[day] = (result[day] || 0) + m.messagesCount;
    });
    return result;
  }
}
