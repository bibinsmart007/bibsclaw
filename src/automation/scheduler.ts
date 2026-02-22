import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
import { appConfig } from "../config.js";

export interface ScheduledTask {
  id: string;
  name: string;
  description: string;
  cronExpression: string;
  action: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  createdAt: Date;
}

export class TaskScheduler extends EventEmitter {
  private tasks: Map<string, ScheduledTask> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private taskFilePath: string;

  constructor() {
    super();
    this.taskFilePath = path.join(appConfig.project.dir, ".bibsclaw", "tasks.json");
  }

  async init(): Promise<void> {
    await this.loadTasks();
    this.startAllEnabled();
  }

  private async loadTasks(): Promise<void> {
    try {
      const data = await fs.readFile(this.taskFilePath, "utf-8");
      const tasks: ScheduledTask[] = JSON.parse(data);
      for (const task of tasks) {
        task.createdAt = new Date(task.createdAt);
        if (task.lastRun) task.lastRun = new Date(task.lastRun);
        this.tasks.set(task.id, task);
      }
    } catch {
      // No tasks file yet
    }
  }

  private async saveTasks(): Promise<void> {
    const dir = path.dirname(this.taskFilePath);
    await fs.mkdir(dir, { recursive: true });
    const tasks = Array.from(this.tasks.values());
    await fs.writeFile(this.taskFilePath, JSON.stringify(tasks, null, 2));
  }

  private parseCronToMs(cronExpression: string): number {
    const presets: Record<string, number> = {
      "@every1m": 60 * 1000,
      "@every5m": 5 * 60 * 1000,
      "@every15m": 15 * 60 * 1000,
      "@every30m": 30 * 60 * 1000,
      "@hourly": 60 * 60 * 1000,
      "@every2h": 2 * 60 * 60 * 1000,
      "@every6h": 6 * 60 * 60 * 1000,
      "@every12h": 12 * 60 * 60 * 1000,
      "@daily": 24 * 60 * 60 * 1000,
      "@weekly": 7 * 24 * 60 * 60 * 1000,
    };
    return presets[cronExpression] || 60 * 60 * 1000;
  }

  addTask(
    name: string,
    description: string,
    cronExpression: string,
    action: string
  ): ScheduledTask {
    const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const task: ScheduledTask = {
      id,
      name,
      description,
      cronExpression,
      action,
      enabled: true,
      runCount: 0,
      createdAt: new Date(),
    };
    this.tasks.set(id, task);
    this.startTask(task);
    this.saveTasks().catch(console.error);
    this.emit("taskAdded", task);
    return task;
  }

  private startTask(task: ScheduledTask): void {
    if (this.timers.has(task.id)) {
      clearInterval(this.timers.get(task.id)!);
    }

    const intervalMs = this.parseCronToMs(task.cronExpression);
    task.nextRun = new Date(Date.now() + intervalMs);

    const timer = setInterval(() => {
      if (!task.enabled) return;
      task.lastRun = new Date();
      task.runCount++;
      task.nextRun = new Date(Date.now() + intervalMs);
      this.emit("taskRun", task);
      this.saveTasks().catch(console.error);
    }, intervalMs);

    this.timers.set(task.id, timer);
  }

  private startAllEnabled(): void {
    for (const task of this.tasks.values()) {
      if (task.enabled) {
        this.startTask(task);
      }
    }
  }

  removeTask(taskId: string): boolean {
    const timer = this.timers.get(taskId);
    if (timer) clearInterval(timer);
    this.timers.delete(taskId);
    const removed = this.tasks.delete(taskId);
    if (removed) {
      this.saveTasks().catch(console.error);
      this.emit("taskRemoved", taskId);
    }
    return removed;
  }

  toggleTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    task.enabled = !task.enabled;
    if (task.enabled) {
      this.startTask(task);
    } else {
      const timer = this.timers.get(taskId);
      if (timer) clearInterval(timer);
      this.timers.delete(taskId);
    }
    this.saveTasks().catch(console.error);
    return true;
  }

  listTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  getTask(taskId: string): ScheduledTask | undefined {
    return this.tasks.get(taskId);
  }

  stopAll(): void {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    this.timers.clear();
  }
}
