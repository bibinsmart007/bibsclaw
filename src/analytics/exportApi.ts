
import express from 'express';
import fs from 'fs';
import path from 'path';

export interface ExportConfig {
  format: 'csv' | 'json' | 'pdf';
  dateRange: { start: Date; end: Date };
  metrics: string[];
  includeCharts: boolean;
}

export class ExportApi {
  private router: express.Router;
  private outputDir: string;

  constructor() {
    this.router = express.Router();
    this.outputDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(this.outputDir)) fs.mkdirSync(this.outputDir, { recursive: true });
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.post('/api/export/csv', async (req, res) => {
      try {
        const config = req.body as ExportConfig;
        const filePath = await this.exportCSV(config);
        res.download(filePath, 'bibsclaw-report.csv');
      } catch (error) {
        res.status(500).json({ error: 'CSV export failed' });
      }
    });

    this.router.post('/api/export/json', async (req, res) => {
      try {
        const config = req.body as ExportConfig;
        const data = await this.exportJSON(config);
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: 'JSON export failed' });
      }
    });

    this.router.post('/api/export/pdf', async (req, res) => {
      try {
        const config = req.body as ExportConfig;
        const filePath = await this.exportPDF(config);
        res.download(filePath, 'bibsclaw-report.pdf');
      } catch (error) {
        res.status(500).json({ error: 'PDF export failed' });
      }
    });
  }

  async exportCSV(config: ExportConfig): Promise<string> {
    const headers = ['Date', 'Metric', 'Value'];
    const rows = config.metrics.map(m => [new Date().toISOString(), m, '0']);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const fp = path.join(this.outputDir, 'report-' + Date.now() + '.csv');
    fs.writeFileSync(fp, csv, 'utf-8');
    return fp;
  }

  async exportJSON(config: ExportConfig): Promise<object> {
    return {
      title: 'BibsClaw Analytics Report',
      generatedAt: new Date().toISOString(),
      dateRange: config.dateRange,
      metrics: config.metrics.map(m => ({ name: m, value: 0, trend: 'stable' })),
    };
  }

  async exportPDF(config: ExportConfig): Promise<string> {
    const content = 'BibsClaw Report\n' + config.metrics.join('\n');
    const fp = path.join(this.outputDir, 'report-' + Date.now() + '.txt');
    fs.writeFileSync(fp, content, 'utf-8');
    return fp;
  }

  getRouter(): express.Router {
    return this.router;
  }
}

export const exportApi = new ExportApi();
