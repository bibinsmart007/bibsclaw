export interface PoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number;
  idleTimeoutMillis?: number;
}
export class ConnectionPoolManager {
  private pools = new Map<string, { config: PoolConfig; active: number }>();
  create(name: string, config: PoolConfig): void {
    this.pools.set(name, { config: { ...config, max: config.max || 20 }, active: 0 });
  }
  get(name: string) { return this.pools.get(name); }
  async healthCheck(): Promise<Record<string, boolean>> {
    const status: Record<string, boolean> = {};
    for (const [name] of this.pools) status[name] = true;
    return status;
  }
  async shutdown(): Promise<void> { this.pools.clear(); }
}
export const poolManager = new ConnectionPoolManager();
