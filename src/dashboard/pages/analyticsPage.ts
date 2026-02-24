
import express from 'express';

export interface AnalyticsPageConfig {
  refreshInterval: number;
  defaultPeriod: string;
  charts: string[];
}

export class AnalyticsPage {
  private config: AnalyticsPageConfig;
  private router: express.Router;

  constructor(config?: Partial<AnalyticsPageConfig>) {
    this.config = {
      refreshInterval: config?.refreshInterval || 30000,
      defaultPeriod: config?.defaultPeriod || '7d',
      charts: config?.charts || ['costs', 'messages', 'response-times', 'tools', 'tasks'],
    };
    this.router = express.Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.get('/api/dashboard/analytics/config', (_req, res) => {
      res.json({
        refreshInterval: this.config.refreshInterval,
        defaultPeriod: this.config.defaultPeriod,
        availableCharts: this.config.charts,
        periods: ['1d', '7d', '30d', '90d', '1y'],
      });
    });

    this.router.get('/api/dashboard/analytics/widgets', (_req, res) => {
      res.json({
        widgets: [
          { id: 'total-messages', type: 'stat-card', label: 'Total Messages', position: { x: 0, y: 0, w: 3, h: 1 } },
          { id: 'api-costs', type: 'stat-card', label: 'API Costs', position: { x: 3, y: 0, w: 3, h: 1 } },
          { id: 'response-time', type: 'stat-card', label: 'Avg Response Time', position: { x: 6, y: 0, w: 3, h: 1 } },
          { id: 'task-success', type: 'stat-card', label: 'Task Success Rate', position: { x: 9, y: 0, w: 3, h: 1 } },
          { id: 'messages-chart', type: 'line-chart', label: 'Messages Over Time', position: { x: 0, y: 1, w: 6, h: 3 } },
          { id: 'costs-chart', type: 'bar-chart', label: 'Cost Breakdown', position: { x: 6, y: 1, w: 6, h: 3 } },
          { id: 'tools-chart', type: 'pie-chart', label: 'Tool Usage', position: { x: 0, y: 4, w: 4, h: 3 } },
          { id: 'activity-heatmap', type: 'heatmap', label: 'Activity Heatmap', position: { x: 4, y: 4, w: 8, h: 3 } },
        ],
      });
    });
  }

  getRouter(): express.Router {
    return this.router;
  }
}

export const analyticsPage = new AnalyticsPage();
