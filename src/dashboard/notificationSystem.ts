// Notification System - Phase 4.1
export interface AppNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  persistent: boolean;
}

export class NotificationManager {
  private notifications: AppNotification[] = [];
  private listeners: Array<(n: AppNotification[]) => void> = [];

  push(type: AppNotification['type'], title: string, message: string, persistent = false): AppNotification {
    const n: AppNotification = { id: Date.now().toString(36), type, title, message, timestamp: new Date(), read: false, persistent };
    this.notifications.unshift(n);
    this.notify();
    if (!persistent) setTimeout(() => this.dismiss(n.id), 5000);
    return n;
  }

  dismiss(id: string): void { this.notifications = this.notifications.filter(n => n.id !== id); this.notify(); }
  markRead(id: string): void { const n = this.notifications.find(n => n.id === id); if (n) n.read = true; this.notify(); }
  getAll(): AppNotification[] { return [...this.notifications]; }
  getUnread(): number { return this.notifications.filter(n => !n.read).length; }
  onChange(fn: (n: AppNotification[]) => void): void { this.listeners.push(fn); }
  private notify(): void { this.listeners.forEach(l => l(this.getAll())); }
}
