import { EventEmitter } from "events";

export interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userId?: string;
  deviceType?: string;
  createdAt: Date;
  lastActive: Date;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: { action: string; title: string; icon?: string }[];
  data?: Record<string, unknown>;
}

export class PushNotificationManager extends EventEmitter {
  private subscriptions: Map<string, PushSubscription> = new Map();
  private vapidPublicKey: string;
  private vapidPrivateKey: string;

  constructor(vapidPublicKey?: string, vapidPrivateKey?: string) {
    super();
    this.vapidPublicKey = vapidPublicKey || process.env.VAPID_PUBLIC_KEY || "";
    this.vapidPrivateKey = vapidPrivateKey || process.env.VAPID_PRIVATE_KEY || "";
  }

  addSubscription(subscription: Omit<PushSubscription, "createdAt" | "lastActive">): void {
    const key = subscription.endpoint;
    this.subscriptions.set(key, {
      ...subscription,
      createdAt: new Date(),
      lastActive: new Date(),
    });
    this.emit("subscribed", subscription.endpoint);
  }

  removeSubscription(endpoint: string): void {
    this.subscriptions.delete(endpoint);
    this.emit("unsubscribed", endpoint);
  }

  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  getAllSubscriptions(): PushSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  async sendToAll(payload: PushPayload): Promise<{ success: number; failed: number }> {
    let success = 0, failed = 0;
    for (const sub of this.subscriptions.values()) {
      const sent = await this.sendToSubscription(sub, payload);
      if (sent) { success++; sub.lastActive = new Date(); }
      else failed++;
    }
    this.emit("batchSent", { payload, success, failed });
    return { success, failed };
  }

  private async sendToSubscription(sub: PushSubscription, payload: PushPayload): Promise<boolean> {
    try {
      this.emit("sending", { endpoint: sub.endpoint, payload });
      return true;
    } catch {
      return false;
    }
  }

  getVapidPublicKey(): string {
    return this.vapidPublicKey;
  }

  hasVapidKeys(): boolean {
    return !!(this.vapidPublicKey && this.vapidPrivateKey);
  }

  sendTaskComplete(taskName: string): Promise<{ success: number; failed: number }> {
    return this.sendToAll({ title: "Task Complete", body: taskName + " finished", icon: "/icons/icon-192.png", tag: "task-complete" });
  }

  sendChatReply(preview: string): Promise<{ success: number; failed: number }> {
    return this.sendToAll({ title: "BibsClaw replied", body: preview.slice(0, 100), icon: "/icons/icon-192.png", tag: "chat-reply", requireInteraction: false });
  }

  sendSystemAlert(message: string): Promise<{ success: number; failed: number }> {
    return this.sendToAll({ title: "BibsClaw Alert", body: message, icon: "/icons/icon-192.png", tag: "system-alert", requireInteraction: true });
  }
}

export const pushNotificationManager = new PushNotificationManager();
