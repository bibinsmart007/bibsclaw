
import express from 'express';

export interface AnalyticsSummary {
  totalConversations: number;
  totalMessages: number;
  totalToolCalls: number;
  avgResponseTime: number;
  apiCosts: { model: string; cost: number; calls: number }[];
  taskSuccess: { total: number; success: number; failed: number };
  topTools: { name: string; count: number }[];
  dailyActivity: { date: string; messages: number; costs: number }[];
}

export class AnalyticsDashboardApi {
  private router: express.Router;
  private metricsStore: Map<string, any> = new Map();

  constructor() {
    this.router = express.Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.get('/api/analytics/summary', async (_req, res) => {
      try {
        const summary = await this.getSummary();
        res.json(summary);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch analytics' });
      }
    });

    this.router.get('/api/analytics/costs', async (req, res) => {
      try {
        const period = (req.query.period as string) || '30d';
        const costs = await this.getCostBreakdown(period);
        res.json(costs);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch costs' });
      }
    });

    this.router.get('/api/analytics/response-times', async (req, res) => {
      try {
        const period = (req.query.period as string) || '7d';
        const times = await this.getResponseTimes(period);
        res.json(times);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch response times' });
      }
    });

    this.router.get('/api/analytics/tasks', async (_req, res) => {
      try {
        const tasks = await this.getTaskMetrics();
        res.json(tasks);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch task metrics' });
      }
    });

    this.router.get('/api/analytics/tools', async (_req, res) => {
      try {
        const tools = await this.getToolUsage();
        res.json(tools);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tool usage' });
      }
    });
  }

  async getSummary(): Promise<AnalyticsSummary> {
    return {
      totalConversations: this.getMetric('conversations', 0),
      totalMessages: this.getMetric('messages', 0),
      totalToolCalls: this.getMetric('toolCalls', 0),
      avgResponseTime: this.getMetric('avgResponseTime', 0),
      apiCosts: this.getMetric('apiCosts', []),
      taskSuccess: this.getMetric('taskSuccess', { total: 0, success: 0, failed: 0 }),
      topTools: this.getMetric('topTools', []),
      dailyActivity: this.getMetric('dailyActivity', []),
    };
  }

  async getCostBreakdown(period: string): Promise<any> {
    return { period, costs: this.getMetric('costBreakdown', []) };
  }

  async getResponseTimes(period: string): Promise<any> {
    return { period, times: this.getMetric('responseTimes', []) };
  }

  async getTaskMetrics(): Promise<any> {
    return this.getMetric('taskMetrics', { pending: 0, completed: 0, failed: 0 });
  }

  async getToolUsage(): Promise<any> {
    return this.getMetric('toolUsage', []);
  }

  recordMetric(key: string, value: any): void {
    this.metricsStore.set(key, value);
  }

  private getMetric(key: string, defaultValue: any): any {
    return this.metricsStore.get(key) ?? defaultValue;
  }

  getRouter(): express.Router {
    return this.router;
  }
}

export const analyticsDashboardApi = new AnalyticsDashboardApi();
