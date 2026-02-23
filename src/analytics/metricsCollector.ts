import { EventEmitter } from "events";
import * as os from "os";

export interface SystemMetrics {
  cpu: number;
  memoryUsed: number;
  memoryTotal: number;
  memoryPercent: number;
  uptime: number;
  loadAvg: number[];
  platform: string;
  nodeVersion: string;
}

export interface ChatMetrics {
  totalChats: number;
  totalMessages: number;
  avgResponseTime: number;
  messagesPerHour: number;
  activeUsers: number;
  topModels: { model: string; count: number }[];
}

export interface TaskMetrics {
  totalTasks: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgExecutionTime: number;
  tasksByType: Map<string, number>;
}

export interface ToolMetrics {
  totalInvocations: number;
  toolUsage: Map<string, { count: number; avgTime: number; errorRate: number }>;
  mostUsed: string;
  leastUsed: string;
}

export class MetricsCollector extends EventEmitter {
  private chatData: { responseTime: number; model: string; timestamp: Date }[] = [];
  private taskData: { success: boolean; type: string; duration: number; timestamp: Date }[] = [];
  private toolData: { tool: string; duration: number; success: boolean; timestamp: Date }[] = [];
  private collectInterval: ReturnType<typeof setInterval> | null = null;
  private systemHistory: SystemMetrics[] = [];
  private maxHistory: number = 1440;

  constructor() { super(); }

  startCollecting(intervalMs: number = 60000): void {
    if (this.collectInterval) return;
    this.collectInterval = setInterval(() => {
      const metrics = this.getSystemMetrics();
      this.systemHistory.push(metrics);
      if (this.systemHistory.length > this.maxHistory) this.systemHistory = this.systemHistory.slice(-this.maxHistory);
      this.emit("systemMetrics", metrics);
    }, intervalMs);
  }

  stopCollecting(): void {
    if (this.collectInterval) { clearInterval(this.collectInterval); this.collectInterval = null; }
  }

  getSystemMetrics(): SystemMetrics {
    const cpus = os.cpus();
    const totalIdle = cpus.reduce((sum, cpu) => sum + cpu.times.idle, 0);
    const totalTick = cpus.reduce((sum, cpu) => sum + Object.values(cpu.times).reduce((s, t) => s + t, 0), 0);
    return {
      cpu: totalTick > 0 ? Math.round((1 - totalIdle / totalTick) * 100) : 0,
      memoryUsed: os.totalmem() - os.freemem(),
      memoryTotal: os.totalmem(),
      memoryPercent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
      uptime: process.uptime(),
      loadAvg: os.loadavg(),
      platform: os.platform(),
      nodeVersion: process.version,
    };
  }

  recordChat(responseTime: number, model: string): void {
    this.chatData.push({ responseTime, model, timestamp: new Date() });
    if (this.chatData.length > 10000) this.chatData = this.chatData.slice(-10000);
  }

  recordTask(success: boolean, type: string, duration: number): void {
    this.taskData.push({ success, type, duration, timestamp: new Date() });
  }

  recordTool(tool: string, duration: number, success: boolean): void {
    this.toolData.push({ tool, duration, success, timestamp: new Date() });
  }

  getChatMetrics(): ChatMetrics {
    const modelCounts = new Map<string, number>();
    this.chatData.forEach(c => modelCounts.set(c.model, (modelCounts.get(c.model) || 0) + 1));
    const topModels = Array.from(modelCounts.entries()).map(([model, count]) => ({ model, count })).sort((a, b) => b.count - a.count).slice(0, 5);
    return {
      totalChats: new Set(this.chatData.map(c => c.timestamp.toDateString())).size,
      totalMessages: this.chatData.length,
      avgResponseTime: this.chatData.length > 0 ? this.chatData.reduce((s, c) => s + c.responseTime, 0) / this.chatData.length : 0,
      messagesPerHour: this.chatData.filter(c => c.timestamp >= new Date(Date.now() - 3600000)).length,
      activeUsers: 1, topModels,
    };
  }

  getTaskMetrics(): TaskMetrics {
    const tasksByType = new Map<string, number>();
    this.taskData.forEach(t => tasksByType.set(t.type, (tasksByType.get(t.type) || 0) + 1));
    const sc = this.taskData.filter(t => t.success).length;
    return { totalTasks: this.taskData.length, successCount: sc, failureCount: this.taskData.length - sc,
      successRate: this.taskData.length > 0 ? sc / this.taskData.length : 1,
      avgExecutionTime: this.taskData.length > 0 ? this.taskData.reduce((s, t) => s + t.duration, 0) / this.taskData.length : 0,
      tasksByType };
  }

  getToolMetrics(): ToolMetrics {
    const tm = new Map<string, { count: number; totalTime: number; errors: number }>();
    this.toolData.forEach(t => { const e = tm.get(t.tool) || { count: 0, totalTime: 0, errors: 0 }; e.count++; e.totalTime += t.duration; if (!t.success) e.errors++; tm.set(t.tool, e); });
    const toolUsage = new Map<string, { count: number; avgTime: number; errorRate: number }>();
    let mostUsed = "", leastUsed = "", maxC = 0, minC = Infinity;
    tm.forEach((s, tool) => { toolUsage.set(tool, { count: s.count, avgTime: s.totalTime / s.count, errorRate: s.errors / s.count }); if (s.count > maxC) { maxC = s.count; mostUsed = tool; } if (s.count < minC) { minC = s.count; leastUsed = tool; } });
    return { totalInvocations: this.toolData.length, toolUsage, mostUsed, leastUsed };
  }

  getSystemHistory(): SystemMetrics[] { return [...this.systemHistory]; }
}

export const metricsCollector = new MetricsCollector();
