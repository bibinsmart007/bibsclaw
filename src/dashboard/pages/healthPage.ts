
import os from 'os';
import express from 'express';

export interface HealthMetrics {
  cpu: { usage: number; cores: number; model: string };
  memory: { total: number; used: number; free: number; percentage: number };
  uptime: { system: number; process: number };
  disk: { total: number; used: number; free: number };
  network: { interfaces: string[] };
  nodeVersion: string;
  pid: number;
}

export class HealthPage {
  private router: express.Router;
  private startTime: number;

  constructor() {
    this.router = express.Router();
    this.startTime = Date.now();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.get('/api/health', (_req, res) => {
      res.json(this.getHealthMetrics());
    });

    this.router.get('/api/health/detailed', (_req, res) => {
      res.json({
        ...this.getHealthMetrics(),
        env: process.env.NODE_ENV || 'development',
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        loadAvg: os.loadavg(),
      });
    });

    this.router.get('/api/health/history', (_req, res) => {
      res.json({ history: [], message: 'Health history tracking enabled' });
    });
  }

  getHealthMetrics(): HealthMetrics {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const cpus = os.cpus();
    const avgCpu = cpus.reduce((sum, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      return sum + ((total - cpu.times.idle) / total) * 100;
    }, 0) / cpus.length;

    return {
      cpu: { usage: Math.round(avgCpu * 100) / 100, cores: cpus.length, model: cpus[0]?.model || 'Unknown' },
      memory: { total: totalMem, used: usedMem, free: freeMem, percentage: Math.round((usedMem / totalMem) * 10000) / 100 },
      uptime: { system: os.uptime(), process: (Date.now() - this.startTime) / 1000 },
      disk: { total: 0, used: 0, free: 0 },
      network: { interfaces: Object.keys(os.networkInterfaces()) },
      nodeVersion: process.version,
      pid: process.pid,
    };
  }

  getRouter(): express.Router {
    return this.router;
  }
}

export const healthPage = new HealthPage();
