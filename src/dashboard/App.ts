// Dashboard App Configuration - Phase 4.1
// React + Tailwind CSS migration entry point

export interface DashboardConfig {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  activeTab: string;
  apiBase: string;
}

export interface DashboardNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: Date;
  read: boolean;
}

export class DashboardApp {
  private config: DashboardConfig;
  private notifications: DashboardNotification[] = [];

  constructor(config?: Partial<DashboardConfig>) {
    this.config = {
      theme: 'dark',
      sidebarOpen: true,
      activeTab: 'chat',
      apiBase: '/api',
      ...config,
    };
  }

  getConfig(): DashboardConfig { return { ...this.config }; }
  setTheme(theme: DashboardConfig['theme']): void { this.config.theme = theme; }
  toggleSidebar(): void { this.config.sidebarOpen = !this.config.sidebarOpen; }
  setActiveTab(tab: string): void { this.config.activeTab = tab; }

  addNotification(type: DashboardNotification['type'], message: string): DashboardNotification {
    const n: DashboardNotification = { id: Date.now().toString(36), type, message, timestamp: new Date(), read: false };
    this.notifications.unshift(n);
    return n;
  }

  getNotifications(): DashboardNotification[] { return [...this.notifications]; }
  getUnreadCount(): number { return this.notifications.filter(n => !n.read).length; }
}
