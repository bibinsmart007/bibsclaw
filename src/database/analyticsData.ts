// Analytics Data Collection - Phase 1 (1.4)
// Tracks and stores usage patterns and system analytics

export interface AnalyticsEvent {
  id: string;
  userId: string;
  eventType: string;
  properties: Record<string, unknown>;
  timestamp: Date;
  sessionId: string;
  source: "dashboard" | "cli" | "telegram" | "api";
}

export interface AnalyticsSummary {
  totalEvents: number;
  uniqueUsers: number;
  eventsByType: Record<string, number>;
  eventsBySource: Record<string, number>;
  avgEventsPerUser: number;
  topEvents: Array<{ type: string; count: number }>;
}

export interface RetentionData {
  cohortDate: string;
  totalUsers: number;
  day1Retention: number;
  day7Retention: number;
  day30Retention: number;
}

export class AnalyticsDataCollector {
  private events: AnalyticsEvent[] = [];
  private maxEvents: number;

  constructor(maxEvents: number = 50000) {
    this.maxEvents = maxEvents;
  }

  async track(event: Omit<AnalyticsEvent, "id" | "timestamp">): Promise<void> {
    const analyticsEvent: AnalyticsEvent = {
      ...event,
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substring(2)}`,
      timestamp: new Date(),
    };
    this.events.push(analyticsEvent);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  async getSummary(startDate?: Date, endDate?: Date): Promise<AnalyticsSummary> {
    let filtered = this.events;
    if (startDate) filtered = filtered.filter((e) => e.timestamp >= startDate);
    if (endDate) filtered = filtered.filter((e) => e.timestamp <= endDate);

    const uniqueUsers = new Set(filtered.map((e) => e.userId)).size;
    const eventsByType: Record<string, number> = {};
    const eventsBySource: Record<string, number> = {};

    for (const event of filtered) {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
      eventsBySource[event.source] = (eventsBySource[event.source] || 0) + 1;
    }

    const topEvents = Object.entries(eventsByType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));

    return {
      totalEvents: filtered.length,
      uniqueUsers,
      eventsByType,
      eventsBySource,
      avgEventsPerUser: uniqueUsers > 0 ? filtered.length / uniqueUsers : 0,
      topEvents,
    };
  }

  async getUserEvents(userId: string, limit: number = 100): Promise<AnalyticsEvent[]> {
    return this.events
      .filter((e) => e.userId === userId)
      .slice(-limit);
  }

  async getEventsByType(eventType: string, limit: number = 100): Promise<AnalyticsEvent[]> {
    return this.events
      .filter((e) => e.eventType === eventType)
      .slice(-limit);
  }

  async clearOlderThan(date: Date): Promise<number> {
    const before = this.events.length;
    this.events = this.events.filter((e) => e.timestamp >= date);
    return before - this.events.length;
  }
}
