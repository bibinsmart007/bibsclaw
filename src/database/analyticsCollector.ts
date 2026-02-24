export interface AnalyticsEvent {
  id: string;
  type: 'chat' | 'tool_use' | 'task' | 'api_call' | 'login' | 'error';
  userId: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
  duration?: number;
}

export interface UsageStats {
  totalChats: number;
  totalToolUses: number;
  totalTasks: number;
  totalApiCalls: number;
  totalErrors: number;
  avgResponseTime: number;
  activeUsers: number;
  topModels: { model: string; count: number }[];
  topTools: { tool: string; count: number }[];
}

export class AnalyticsCollector {
  private events: AnalyticsEvent[] = [];
  private counter = 0;

  track(type: AnalyticsEvent['type'], userId: string, metadata: Record<string, unknown> = {}, duration?: number): void {
    this.events.push({
      id: `evt_${++this.counter}_${Date.now()}`,
      type, userId, metadata, duration,
      timestamp: new Date(),
    });
    if (this.events.length > 10000) {
      this.events = this.events.slice(-5000);
    }
  }

  getStats(since?: Date): UsageStats {
    const filtered = since ? this.events.filter(e => e.timestamp >= since) : this.events;
    const chatEvents = filtered.filter(e => e.type === 'chat');
    const toolEvents = filtered.filter(e => e.type === 'tool_use');
    const taskEvents = filtered.filter(e => e.type === 'task');
    const apiEvents = filtered.filter(e => e.type === 'api_call');
    const errorEvents = filtered.filter(e => e.type === 'error');
    const durations = filtered.filter(e => e.duration).map(e => e.duration!);
    const avgResponseTime = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const uniqueUsers = new Set(filtered.map(e => e.userId));
    const modelCounts = new Map<string, number>();
    chatEvents.forEach(e => {
      const model = (e.metadata.model as string) || 'unknown';
      modelCounts.set(model, (modelCounts.get(model) || 0) + 1);
    });
    const toolCounts = new Map<string, number>();
    toolEvents.forEach(e => {
      const tool = (e.metadata.tool as string) || 'unknown';
      toolCounts.set(tool, (toolCounts.get(tool) || 0) + 1);
    });
    return {
      totalChats: chatEvents.length,
      totalToolUses: toolEvents.length,
      totalTasks: taskEvents.length,
      totalApiCalls: apiEvents.length,
      totalErrors: errorEvents.length,
      avgResponseTime: Math.round(avgResponseTime),
      activeUsers: uniqueUsers.size,
      topModels: Array.from(modelCounts.entries()).map(([model, count]) => ({ model, count })).sort((a, b) => b.count - a.count).slice(0, 5),
      topTools: Array.from(toolCounts.entries()).map(([tool, count]) => ({ tool, count })).sort((a, b) => b.count - a.count).slice(0, 5),
    };
  }

  getEventsByUser(userId: string, limit: number = 100): AnalyticsEvent[] {
    return this.events.filter(e => e.userId === userId).slice(-limit);
  }

  getEventsByType(type: AnalyticsEvent['type'], limit: number = 100): AnalyticsEvent[] {
    return this.events.filter(e => e.type === type).slice(-limit);
  }

  getRecentEvents(limit: number = 50): AnalyticsEvent[] {
    return this.events.slice(-limit);
  }

  clear(): void {
    this.events = [];
  }

  exportCSV(): string {
    const header = 'id,type,userId,timestamp,duration,metadata';
    const rows = this.events.map(e => `${e.id},${e.type},${e.userId},${e.timestamp.toISOString()},${e.duration || ''},${JSON.stringify(e.metadata).replace(/,/g, ';')}`);
    return [header, ...rows].join('\n');
  }
}

export const analyticsCollector = new AnalyticsCollector();
