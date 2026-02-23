import { EventEmitter } from "events";
import * as fs from "fs";
export type EventType = "fileChange" | "gitPush" | "error" | "schedule" | "custom";
export interface EventRule { id: string; type: EventType; pattern?: string; handler: (data: unknown) => void | Promise<void>; enabled: boolean; }
export class EventDriver extends EventEmitter {
  private rules = new Map<string, EventRule>();
  private watchers = new Map<string, fs.FSWatcher>();
  addRule(rule: EventRule): void { this.rules.set(rule.id, rule); if (rule.type === "fileChange" && rule.pattern) this.watchFile(rule.id, rule.pattern); this.emit("ruleAdded", { id: rule.id }); }
  removeRule(id: string): boolean { const w = this.watchers.get(id); if (w) { w.close(); this.watchers.delete(id); } return this.rules.delete(id); }
  private watchFile(id: string, filePath: string): void {
    try {
      const watcher = fs.watch(filePath, (eventType) => {
        const rule = this.rules.get(id);
        if (rule && rule.enabled) { rule.handler({ eventType, file: filePath }); this.emit("eventTriggered", { id, eventType, file: filePath }); }
      });
      this.watchers.set(id, watcher);
    } catch (_e) { console.error(`[EventDriver] Cannot watch: ${filePath}`); }
  }
  async triggerCustom(eventName: string, data: unknown): Promise<void> {
    for (const [, rule] of this.rules) {
      if (rule.type === "custom" && rule.pattern === eventName && rule.enabled) {
        try { await rule.handler(data); } catch (e) { this.emit("eventError", { id: rule.id, error: e }); }
      }
    }
  }
  listRules() { return Array.from(this.rules.entries()).map(([id, r]) => ({ id, type: r.type, enabled: r.enabled })); }
  stopAll(): void { for (const [, w] of this.watchers) w.close(); this.watchers.clear(); }
}
