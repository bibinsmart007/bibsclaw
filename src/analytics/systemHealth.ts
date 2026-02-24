// System Health Monitoring - Phase 4.2
export interface HealthSnapshot {
  cpuUsage: number;
  memoryUsed: number;
  memoryTotal: number;
  uptime: number;
  timestamp: Date;
}

export class SystemHealthMonitor {
  private snapshots: HealthSnapshot[] = [];
  private maxSnapshots: number = 1440;
  
  capture(): HealthSnapshot {
    const mem = process.memoryUsage();
    const snap: HealthSnapshot = {
      cpuUsage: 0,
      memoryUsed: mem.heapUsed,
      memoryTotal: mem.heapTotal,
      uptime: process.uptime(),
      timestamp: new Date(),
    };
    this.snapshots.push(snap);
    if (this.snapshots.length > this.maxSnapshots) this.snapshots.shift();
    return snap;
  }
  
  getLatest(): HealthSnapshot | null { return this.snapshots[this.snapshots.length - 1] || null; }
  getHistory(count?: number): HealthSnapshot[] { return this.snapshots.slice(-(count || 60)); }
}
