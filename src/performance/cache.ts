import { createClient } from 'redis';

export class CacheService {
  private client: ReturnType<typeof createClient> | null = null;
  async connect(url: string = 'redis://localhost:6379'): Promise<void> {
    this.client = createClient({ url });
    await this.client.connect();
  }
  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    const val = await this.client.get(key);
    return val ? JSON.parse(val) : null;
  }
  async set(key: string, value: unknown, ttl: number = 300): Promise<void> {
    if (!this.client) return;
    await this.client.setEx(key, ttl, JSON.stringify(value));
  }
  async invalidate(pattern: string): Promise<void> {
    if (!this.client) return;
    const keys = await this.client.keys(pattern);
    if (keys.length) await this.client.del(keys);
  }
}

export const cache = new CacheService();
