import { Pool, PoolConfig } from 'pg';

export class ConnectionPoolManager {
  private pools = new Map<string, Pool>();
  create(name: string, config: PoolConfig): Pool {
    const pool = new Pool({ ...config, max: 20, idleTimeoutMillis: 30000 });
    this.pools.set(name, pool);
    return pool;
  }
  get(name: string): Pool | undefined {
    return this.pools.get(name);
  }
  async healthCheck(): Promise<Record<string, boolean>> {
    const status: Record<string, boolean> = {};
    for (const [name, pool] of this.pools) {
      try { await pool.query('SELECT 1'); status[name] = true; }
      catch { status[name] = false; }
    }
    return status;
  }
  async shutdown(): Promise<void> {
    for (const pool of this.pools.values()) await pool.end();
  }
}

export const poolManager = new ConnectionPoolManager();
