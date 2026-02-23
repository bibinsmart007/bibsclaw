import { EventEmitter } from "events";
export interface HeartbeatConfig { intervalMs: number; checks: Array<{ name: string; fn: () => Promise<boolean>; onFail?: () => Promise<void> }>; }
export class ProactiveHeartbeat extends EventEmitter {
  private config: HeartbeatConfig;
  private timer: ReturnType<typeof setInterval> | null = null;
  private status = new Map<string, { healthy: boolean; lastCheck: Date; consecutiveFails: number }>();
  constructor(config: HeartbeatConfig) { super(); this.config = config; }
  start(): void {
    this.timer = setInterval(() => this.beat(), this.config.intervalMs);
    console.log(`[Heartbeat] Started - interval ${this.config.intervalMs}ms`);
    this.beat();
  }
  stop(): void { if (this.timer) { clearInterval(this.timer); this.timer = null; } }
  private async beat(): Promise<void> {
    for (const check of this.config.checks) {
      try {
        const ok = await check.fn();
        const prev = this.status.get(check.name);
        this.status.set(check.name, { healthy: ok, lastCheck: new Date(), consecutiveFails: ok ? 0 : (prev?.consecutiveFails || 0) + 1 });
        if (!ok) {
          this.emit("unhealthy", { name: check.name, consecutiveFails: (prev?.consecutiveFails || 0) + 1 });
          if (check.onFail) await check.onFail();
        } else if (prev && !prev.healthy) { this.emit("recovered", { name: check.name }); }
      } catch (e) {
        this.status.set(check.name, { healthy: false, lastCheck: new Date(), consecutiveFails: (this.status.get(check.name)?.consecutiveFails || 0) + 1 });
        this.emit("error", { name: check.name, error: e });
      }
    }
    this.emit("beat", { timestamp: new Date(), statuses: this.getStatus() });
  }
  getStatus() { return Object.fromEntries(this.status); }
  isHealthy(): boolean { return Array.from(this.status.values()).every(s => s.healthy); }
}
