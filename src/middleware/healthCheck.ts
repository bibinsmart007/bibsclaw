import * as os from "os";

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  memory: { used: number; total: number; percent: number };
  cpu: { load: number[] };
  checks: Record<string, CheckResult>;
  timestamp: number;
}

interface CheckResult {
  ok: boolean;
  latencyMs?: number;
  message?: string;
}

type CheckFn = () => Promise<CheckResult>;

export class HealthCheck {
  private checks: Map<string, CheckFn> = new Map();
  private readonly startTime = Date.now();
  private restartCallbacks: Array<(reason: string) => void> = [];
  private intervalHandle: NodeJS.Timeout | null = null;

  register(name: string, fn: CheckFn): void {
    this.checks.set(name, fn);
  }

  onAutoRestart(cb: (reason: string) => void): void {
    this.restartCallbacks.push(cb);
  }

  async run(): Promise<HealthStatus> {
    const results: Record<string, CheckResult> = {};
    for (const [name, fn] of this.checks.entries()) {
      const start = Date.now();
      try {
        const r = await fn();
        results[name] = { ...r, latencyMs: Date.now() - start };
      } catch (err) {
        results[name] = { ok: false, message: String(err), latencyMs: Date.now() - start };
      }
    }
    const mem = process.memoryUsage();
    const totalMem = os.totalmem();
    const allOk = Object.values(results).every((r) => r.ok);
    const anyOk = Object.values(results).some((r) => r.ok);
    return {
      status: allOk ? "healthy" : anyOk ? "degraded" : "unhealthy",
      uptime: Date.now() - this.startTime,
      memory: {
        used: mem.heapUsed,
        total: totalMem,
        percent: Math.round((mem.heapUsed / totalMem) * 100),
      },
      cpu: { load: os.loadavg() },
      checks: results,
      timestamp: Date.now(),
    };
  }

  startMonitoring(intervalMs = 30000): void {
    this.intervalHandle = setInterval(async () => {
      const status = await this.run();
      if (status.status === "unhealthy") {
        const reason = Object.entries(status.checks)
          .filter(([, v]) => !v.ok)
          .map(([k, v]) => `${k}: ${v.message}`)
          .join("; ");
        this.restartCallbacks.forEach((cb) => cb(reason));
      }
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalHandle) clearInterval(this.intervalHandle);
  }
}
