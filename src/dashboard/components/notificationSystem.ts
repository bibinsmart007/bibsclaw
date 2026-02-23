import { EventEmitter } from "events";

export type NotificationType = "info" | "success" | "warning" | "error" | "task" | "chat";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  dismissed: boolean;
  actionUrl?: string;
  actionLabel?: string;
  autoHide: boolean;
  duration: number;
  source?: string;
  icon?: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  sound: boolean;
  browserPush: boolean;
  types: Record<NotificationType, boolean>;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  maxVisible: number;
}

const DEFAULT_PREFS: NotificationPreferences = {
  enabled: true,
  sound: true,
  browserPush: true,
  types: { info: true, success: true, warning: true, error: true, task: true, chat: true },
  maxVisible: 5,
};

export class NotificationSystem extends EventEmitter {
  private notifications: Notification[] = [];
  private preferences: NotificationPreferences;
  private maxStored: number = 200;

  constructor(prefs?: Partial<NotificationPreferences>) {
    super();
    this.preferences = { ...DEFAULT_PREFS, ...prefs };
  }

  push(type: NotificationType, title: string, message: string, options?: Partial<Notification>): Notification {
    if (!this.preferences.enabled) return this.createEmpty();
    if (!this.preferences.types[type]) return this.createEmpty();
    if (this.isQuietHours()) return this.createEmpty();
    const notification: Notification = {
      id: "notif_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type, title, message,
      timestamp: new Date(),
      read: false, dismissed: false,
      autoHide: type !== "error",
      duration: type === "error" ? 10000 : 5000,
      ...options,
    };
    this.notifications.unshift(notification);
    if (this.notifications.length > this.maxStored) {
      this.notifications = this.notifications.slice(0, this.maxStored);
    }
    this.emit("notification", notification);
    if (notification.autoHide) {
      setTimeout(() => this.dismiss(notification.id), notification.duration);
    }
    return notification;
  }

  private createEmpty(): Notification {
    return { id: "", type: "info", title: "", message: "", timestamp: new Date(), read: true, dismissed: true, autoHide: true, duration: 0 };
  }

  private isQuietHours(): boolean {
    if (!this.preferences.quietHoursStart || !this.preferences.quietHoursEnd) return false;
    const now = new Date();
    const hours = now.getHours() * 100 + now.getMinutes();
    const start = parseInt(this.preferences.quietHoursStart.replace(":", ""));
    const end = parseInt(this.preferences.quietHoursEnd.replace(":", ""));
    if (start <= end) return hours >= start && hours <= end;
    return hours >= start || hours <= end;
  }

  dismiss(id: string): void {
    const n = this.notifications.find(n => n.id === id);
    if (n) { n.dismissed = true; this.emit("dismissed", id); }
  }

  markRead(id: string): void {
    const n = this.notifications.find(n => n.id === id);
    if (n) { n.read = true; this.emit("read", id); }
  }

  markAllRead(): void {
    this.notifications.forEach(n => { n.read = true; });
    this.emit("allRead");
  }

  getAll(): Notification[] {
    return this.notifications.filter(n => !n.dismissed);
  }

  getUnread(): Notification[] {
    return this.notifications.filter(n => !n.read && !n.dismissed);
  }

  getUnreadCount(): number {
    return this.getUnread().length;
  }

  getByType(type: NotificationType): Notification[] {
    return this.notifications.filter(n => n.type === type && !n.dismissed);
  }

  clear(): void {
    this.notifications = [];
    this.emit("cleared");
  }

  updatePreferences(prefs: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...prefs };
    this.emit("preferencesUpdated", this.preferences);
  }

  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  success(title: string, message: string): Notification {
    return this.push("success", title, message);
  }

  error(title: string, message: string): Notification {
    return this.push("error", title, message, { autoHide: false });
  }

  warning(title: string, message: string): Notification {
    return this.push("warning", title, message);
  }

  info(title: string, message: string): Notification {
    return this.push("info", title, message);
  }

  taskComplete(taskName: string): Notification {
    return this.push("task", "Task Complete", taskName + " finished successfully");
  }

  chatMessage(from: string, preview: string): Notification {
    return this.push("chat", "New Message", from + ": " + preview);
  }
}

export const notificationSystem = new NotificationSystem();
