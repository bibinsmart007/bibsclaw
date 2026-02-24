// Audit Log - Phase 4.4
export interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  details: Record<string, unknown>;
  ip: string;
  timestamp: Date;
}

export class AuditLogger {
  private entries: AuditEntry[] = [];

  log(userId: string, action: string, resource: string, details: Record<string, unknown> = {}, ip: string = 'unknown'): AuditEntry {
    const entry: AuditEntry = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), userId, action, resource, details, ip, timestamp: new Date() };
    this.entries.push(entry);
    return entry;
  }

  query(filters: { userId?: string; action?: string; resource?: string; from?: Date; to?: Date }): AuditEntry[] {
    return this.entries.filter(e => {
      if (filters.userId && e.userId !== filters.userId) return false;
      if (filters.action && e.action !== filters.action) return false;
      if (filters.resource && e.resource !== filters.resource) return false;
      if (filters.from && e.timestamp < filters.from) return false;
      if (filters.to && e.timestamp > filters.to) return false;
      return true;
    });
  }

  getRecent(count: number = 50): AuditEntry[] { return this.entries.slice(-count).reverse(); }
}
