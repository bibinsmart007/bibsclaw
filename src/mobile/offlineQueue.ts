// Offline Message Queue - Phase 4.3
export interface QueuedMessage {
  id: string;
  content: string;
  timestamp: Date;
  retries: number;
  status: 'pending' | 'sending' | 'sent' | 'failed';
}

export class OfflineQueue {
  private queue: QueuedMessage[] = [];
  private maxRetries: number = 3;
  
  enqueue(content: string): QueuedMessage {
    const msg: QueuedMessage = { id: Date.now().toString(36), content, timestamp: new Date(), retries: 0, status: 'pending' };
    this.queue.push(msg);
    return msg;
  }
  
  async flush(sendFn: (msg: QueuedMessage) => Promise<boolean>): Promise<number> {
    let sent = 0;
    for (const msg of this.queue.filter(m => m.status === 'pending')) {
      msg.status = 'sending';
      const ok = await sendFn(msg);
      if (ok) { msg.status = 'sent'; sent++; }
      else { msg.retries++; msg.status = msg.retries >= this.maxRetries ? 'failed' : 'pending'; }
    }
    this.queue = this.queue.filter(m => m.status !== 'sent');
    return sent;
  }
  
  getPending(): QueuedMessage[] { return this.queue.filter(m => m.status === 'pending'); }
  getAll(): QueuedMessage[] { return [...this.queue]; }
}
