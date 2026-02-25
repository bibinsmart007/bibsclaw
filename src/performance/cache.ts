export class CacheService {
  private store = new Map<string, { value: string; expires: number }>();
  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.expires) {
      this.store.delete(key); return null;
    }
    return JSON.parse(entry.value);
  }
  async set(key: string, value: unknown, ttl: number = 300): Promise<void> {
    this.store.set(key, {
      value: JSON.stringify(value),
      expires: Date.now() + ttl * 1000,
    });
  }
  async invalidate(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const key of this.store.keys()) {
      if (regex.test(key)) this.store.delete(key);
    }
  }
  async clear(): Promise<void> { this.store.clear(); }
}
export const cache = new CacheService();
