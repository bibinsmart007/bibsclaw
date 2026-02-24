
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ReactAppConfig {
  port: number;
  apiBaseUrl: string;
  wsUrl: string;
  enableHMR: boolean;
}

export class ReactDashboardApp {
  private config: ReactAppConfig;
  private router: express.Router;

  constructor(config: Partial<ReactAppConfig> = {}) {
    this.config = {
      port: config.port || 3000,
      apiBaseUrl: config.apiBaseUrl || '/api',
      wsUrl: config.wsUrl || 'ws://localhost:3000',
      enableHMR: config.enableHMR ?? true,
    };
    this.router = express.Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // API routes for dashboard
    this.router.get('/api/dashboard/config', (_req, res) => {
      res.json({
        appName: 'BibsClaw Dashboard',
        version: '4.0.0',
        features: {
          darkMode: true,
          chatTabs: true,
          fileExplorer: true,
          terminal: true,
          analytics: true,
          notifications: true,
          pwa: true,
        },
      });
    });

    // Serve React build
    this.router.use(express.static(path.join(__dirname, '../../public/dashboard')));

    // SPA fallback
    this.router.get('/dashboard/*', (_req, res) => {
      res.sendFile(path.join(__dirname, '../../public/dashboard/index.html'));
    });
  }

  getRouter(): express.Router {
    return this.router;
  }

  getConfig(): ReactAppConfig {
    return { ...this.config };
  }
}

export const reactDashboardApp = new ReactDashboardApp();
