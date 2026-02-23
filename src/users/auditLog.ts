import { EventEmitter } from "events";
import * as fs from "fs";
import * as path from "path";

export interface AuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  username: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface AuditFilter {
  userId?: string;
  action?: string;
  resource?: string;
  severity?: AuditEntry["severity"];
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
  limit?: number;
}

export class AuditLog extends EventEmitter {
  private entries: AuditEntry[] = [];
  private maxEntries: number = 100000;
  private persistPath: string;

  constructor(persistPath: string = "./logs/audit.jsonl") {
    super();
    this.persistPath = persistPath;
    const dir = path.dirname(persistPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  log(userId: string, username: string, action: string, resource: string, details: Record<string, unknown>, success: boolean = true, severity: AuditEntry["severity"] = "low"): AuditEntry {
    const entry: AuditEntry = {
      id: "audit_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: new Date(),
      userId, username, action, resource, details, success, severity,
    };
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) this.entries = this.entries.slice(-this.maxEntries);
    this.emit("logged", entry);
    if (severity === "critical" || severity === "high") this.emit("highSeverity", entry);
    try { fs.appendFileSync(this.persistPath, JSON.stringify(entry) + "\n", "utf-8"); } catch { /* non-fatal */ }
    return entry;
  }

  query(filter: AuditFilter): AuditEntry[] {
    let results = [...this.entries];
    if (filter.userId) results = results.filter(e => e.userId === filter.userId);
    if (filter.action) results = results.filter(e => e.action.includes(filter.action!));
    if (filter.resource) results = results.filter(e => e.resource === filter.resource);
    if (filter.severity) results = results.filter(e => e.severity === filter.severity);
    if (filter.success !== undefined) results = results.filter(e => e.success === filter.success);
    if (filter.startDate) results = results.filter(e => e.timestamp >= filter.startDate!);
    if (filter.endDate) results = results.filter(e => e.timestamp <= filter.endDate!);
    results = results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    if (filter.limit) results = results.slice(0, filter.limit);
    return results;
  }

  getStats(): { total: number; byAction: Map<string, number>; bySeverity: Map<string, number>; failureRate: number } {
    const byAction = new Map<string, number>();
    const bySeverity = new Map<string, number>();
    this.entries.forEach(e => {
      byAction.set(e.action, (byAction.get(e.action) || 0) + 1);
      bySeverity.set(e.severity, (bySeverity.get(e.severity) || 0) + 1);
    });
    return { total: this.entries.length, byAction, bySeverity, failureRate: this.entries.length > 0 ? this.entries.filter(e => !e.success).length / this.entries.length : 0 };
  }

  getSecurityEvents(): AuditEntry[] {
    return this.entries.filter(e => e.severity === "high" || e.severity === "critical" || !e.success).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 100);
  }

  getUserActivity(userId: string, hours: number = 24): AuditEntry[] {
    const since = new Date(Date.now() - hours * 3600000);
    return this.entries.filter(e => e.userId === userId && e.timestamp >= since).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  clear(): void { this.entries = []; this.emit("cleared"); }
  getAll(): AuditEntry[] { return [...this.entries]; }
}

export const auditLog = new AuditLog();
