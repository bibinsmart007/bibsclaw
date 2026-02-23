export type DegradationLevel = "full" | "limited" | "minimal" | "offline";

interface ServiceState {
  available: boolean;
  lastCheck: number;
  failCount: number;
  degradedSince: number | null;
}

export class GracefulDegradation {
  private services: Map<string, ServiceState> = new Map();
  private readonly failThreshold = 3;
  private readonly recoverCheckMs = 60000;

  register(serviceName: string): void {
    this.services.set(serviceName, {
      available: true,
      lastCheck: Date.now(),
      failCount: 0,
      degradedSince: null,
    });
  }

  markFailed(serviceName: string): void {
    const svc = this.services.get(serviceName);
    if (!svc) return;
    svc.failCount++;
    svc.lastCheck = Date.now();
    if (svc.failCount >= this.failThreshold && svc.available) {
      svc.available = false;
      svc.degradedSince = Date.now();
      console.warn(`[GracefulDegradation] Service "${serviceName}" marked unavailable after ${svc.failCount} failures`);
    }
  }

  markRecovered(serviceName: string): void {
    const svc = this.services.get(serviceName);
    if (!svc) return;
    svc.available = true;
    svc.failCount = 0;
    svc.degradedSince = null;
    svc.lastCheck = Date.now();
  }

  isAvailable(serviceName: string): boolean {
    return this.services.get(serviceName)?.available ?? false;
  }

  async withFallback<T>(
    serviceName: string,
    primary: () => Promise<T>,
    fallback: () => Promise<T>
  ): Promise<T> {
    if (!this.isAvailable(serviceName)) return fallback();
    try {
      const result = await primary();
      this.markRecovered(serviceName);
      return result;
    } catch (err) {
      this.markFailed(serviceName);
      return fallback();
    }
  }

  getDegradationLevel(): DegradationLevel {
    const states = Array.from(this.services.values());
    if (states.length === 0) return "full";
    const available = states.filter((s) => s.available).length;
    const ratio = available / states.length;
    if (ratio === 1) return "full";
    if (ratio >= 0.66) return "limited";
    if (ratio >= 0.33) return "minimal";
    return "offline";
  }

  getStatus(): Record<string, { available: boolean; degradedSince: number | null }> {
    const result: Record<string, { available: boolean; degradedSince: number | null }> = {};
    for (const [name, state] of this.services.entries()) {
      result[name] = { available: state.available, degradedSince: state.degradedSince };
    }
    return result;
  }
}
