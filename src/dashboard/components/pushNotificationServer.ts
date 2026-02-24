
import express from 'express';

export interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userId: string;
  createdAt: Date;
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  actions?: { action: string; title: string; icon?: string }[];
}

export class PushNotificationServer {
  private subscriptions: Map<string, PushSubscription> = new Map();
  private router: express.Router;
  private vapidKeys: { publicKey: string; privateKey: string } | null = null;

  constructor() {
    this.router = express.Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.post('/api/notifications/subscribe', (req, res) => {
      try {
        const { endpoint, keys, userId } = req.body;
        const sub: PushSubscription = { endpoint, keys, userId, createdAt: new Date() };
        this.subscriptions.set(userId, sub);
        res.json({ success: true, message: 'Subscribed to push notifications' });
      } catch (error) {
        res.status(400).json({ error: 'Invalid subscription data' });
      }
    });

    this.router.delete('/api/notifications/unsubscribe', (req, res) => {
      const { userId } = req.body;
      this.subscriptions.delete(userId);
      res.json({ success: true });
    });

    this.router.get('/api/notifications/vapid-key', (_req, res) => {
      res.json({ publicKey: this.vapidKeys?.publicKey || '' });
    });

    this.router.get('/api/notifications/history', (req, res) => {
      const userId = req.query.userId as string;
      res.json({ userId, notifications: [] });
    });
  }

  async sendNotification(userId: string, payload: NotificationPayload): Promise<boolean> {
    const sub = this.subscriptions.get(userId);
    if (!sub) return false;
    console.log('[PushNotification] Sending to', userId, ':', payload.title);
    return true;
  }

  async broadcastNotification(payload: NotificationPayload): Promise<number> {
    let sent = 0;
    for (const [userId] of this.subscriptions) {
      const success = await this.sendNotification(userId, payload);
      if (success) sent++;
    }
    return sent;
  }

  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  getRouter(): express.Router {
    return this.router;
  }
}

export const pushNotificationServer = new PushNotificationServer();
