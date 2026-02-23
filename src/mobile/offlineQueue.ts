import { EventEmitter } from "events";

export type QueueItemStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export interface QueueItem {
  id: string;
  type: "chat" | "task" | "upload" | "command" | "api";
  payload: Record<string, unknown>;
  status: QueueItemStatus;
  priority: number;
  retries: number;
  maxRetries: number;
  createdAt: Date;
  processedAt?: Date;
  result?: unknown;
  error?: string;
}

export class OfflineQueue extends EventEmitter {
  private queue: QueueItem[] = [];
  private isOnline: boolean = true;
  private isProcessing: boolean = false;
  private maxQueueSize: number = 100;

  constructor() {
    super();
  }

  setOnlineStatus(online: boolean): void {
    const wasOffline = !this.isOnline;
    this.isOnline = online;
    this.emit(online ? "online" : "offline");
    if (online && wasOffline) {
      this.processQueue();
    }
  }

  enqueue(type: QueueItem["type"], payload: Record<string, unknown>, priority: number = 5): QueueItem {
    if (this.queue.length >= this.maxQueueSize) {
      const lowestPriority = this.queue.filter(i => i.status === "pending").sort((a, b) => a.priority - b.priority)[0];
      if (lowestPriority && lowestPriority.priority < priority) {
        lowestPriority.status = "cancelled";
        this.queue = this.queue.filter(i => i.id !== lowestPriority.id);
      } else {
        throw new Error("Queue is full");
      }
    }
    const item: QueueItem = {
      id: "q_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type, payload, status: "pending", priority, retries: 0, maxRetries: 3, createdAt: new Date(),
    };
    this.queue.push(item);
    this.queue.sort((a, b) => b.priority - a.priority);
    this.emit("enqueued", item);
    if (this.isOnline && !this.isProcessing) {
      this.processQueue();
    }
    return item;
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || !this.isOnline) return;
    this.isProcessing = true;
    const pending = this.queue.filter(i => i.status === "pending");
    for (const item of pending) {
      if (!this.isOnline) break;
      item.status = "processing";
      this.emit("processing", item);
      try {
        const result = await this.processItem(item);
        item.status = "completed";
        item.result = result;
        item.processedAt = new Date();
        this.emit("completed", item);
      } catch (err) {
        item.retries++;
        if (item.retries >= item.maxRetries) {
          item.status = "failed";
          item.error = err instanceof Error ? err.message : "Unknown error";
          this.emit("failed", item);
        } else {
          item.status = "pending";
          this.emit("retry", item);
        }
      }
    }
    this.isProcessing = false;
    this.cleanup();
  }

  private async processItem(item: QueueItem): Promise<unknown> {
    this.emit("processItem", item);
    return { processed: true, itemId: item.id };
  }

  private cleanup(): void {
    const maxCompleted = 50;
    const completed = this.queue.filter(i => i.status === "completed" || i.status === "cancelled");
    if (completed.length > maxCompleted) {
      const toRemove = new Set(completed.slice(0, completed.length - maxCompleted).map(i => i.id));
      this.queue = this.queue.filter(i => !toRemove.has(i.id));
    }
  }

  getQueue(): QueueItem[] { return [...this.queue]; }
  getPending(): QueueItem[] { return this.queue.filter(i => i.status === "pending"); }
  getCompleted(): QueueItem[] { return this.queue.filter(i => i.status === "completed"); }
  getFailed(): QueueItem[] { return this.queue.filter(i => i.status === "failed"); }
  getStats(): { total: number; pending: number; completed: number; failed: number; isOnline: boolean } {
    return { total: this.queue.length, pending: this.getPending().length, completed: this.getCompleted().length, failed: this.getFailed().length, isOnline: this.isOnline };
  }
  cancel(id: string): void {
    const item = this.queue.find(i => i.id === id);
    if (item && item.status === "pending") { item.status = "cancelled"; this.emit("cancelled", id); }
  }
  clear(): void { this.queue = []; this.emit("cleared"); }
}

export const offlineQueue = new OfflineQueue();
