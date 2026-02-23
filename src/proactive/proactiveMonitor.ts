import { EventEmitter } from "events";
export interface MonitorRule { id: string; name: string; check: () => Promise<unknown>; condition: (result: unknown) => boolean; action: (result: unknown) => Promise<void>; intervalMs: number; enabled: boolean; }
export class ProactiveMonitor extends EventEmitter {
  private rules = new Map<string, MonitorRule>();
  private timers = new Map<string, ReturnType<typeof setInterval>>();
  addRule(rule: MonitorRule): void {
    this.rules.set(rule.id, rule);
    if (rule.enabled) this.startRule(rule.id);
  }
  private startRule(id: string): void {
    const rule = this.rules.get(id);
    if (!rule) return;
    const timer = setInterval(async () => {
      try {
        const result = await rule.check();
        if (rule.condition(result)) {
          this.emit("triggered", { id: rule.id, name: rule.name, result });
          await rule.action(result);
        }
      } catch (e) { this.emit("error", { id: rule.id, error: e }); }
    }, rule.intervalMs);
    this.timers.set(id, timer);
  }
  removeRule(id: string): void {
    const timer = this.timers.get(id);
    if (timer) clearInterval(timer);
    this.timers.delete(id); this.rules.delete(id);
  }
  pauseRule(id: string): void { const timer = this.timers.get(id); if (timer) { clearInterval(timer); this.timers.delete(id); } const rule = this.rules.get(id); if (rule) rule.enabled = false; }
  resumeRule(id: string): void { const rule = this.rules.get(id); if (rule) { rule.enabled = true; this.startRule(id); } }
  listRules() { return Array.from(this.rules.entries()).map(([id, r]) => ({ id, name: r.name, enabled: r.enabled })); }
  stopAll(): void { for (const [, timer] of this.timers) clearInterval(timer); this.timers.clear(); }
}
