export interface AuditEvent {
  id: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: Date;
  details: Record<string, unknown>;
  ip?: string;
}

export class AuditTrailService {
  private events: AuditEvent[] = [];
  log(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
    const entry: AuditEvent = {
      ...event,
      id: `audit-${Date.now()}`,
      timestamp: new Date(),
    };
    this.events.push(entry);
    return entry;
  }
  query(filters: Partial<AuditEvent>): AuditEvent[] {
    return this.events.filter(e => {
      return Object.entries(filters).every(([k, v]) => (e as any)[k] === v);
    });
  }
  async exportReport(from: Date, to: Date): Promise<AuditEvent[]> {
    return this.events.filter(e => e.timestamp >= from && e.timestamp <= to);
  }
}

export const auditTrail = new AuditTrailService();
