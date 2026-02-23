import { EventEmitter } from "events";
export interface TaskNode { id: string; dependencies: string[]; handler: () => void | Promise<void>; status: "pending" | "running" | "completed" | "failed"; retries: number; maxRetries: number; backoffMs: number; }
export class TaskDependencyGraph extends EventEmitter {
  private tasks = new Map<string, TaskNode>();
  addTask(id: string, deps: string[], handler: () => void | Promise<void>, maxRetries = 3, backoffMs = 1000): void {
    this.tasks.set(id, { id, dependencies: deps, handler, status: "pending", retries: 0, maxRetries, backoffMs });
  }
  async execute(): Promise<void> {
    const executed = new Set<string>();
    const execute = async (id: string): Promise<void> => {
      if (executed.has(id)) return;
      const task = this.tasks.get(id);
      if (!task) throw new Error(`Task not found: ${id}`);
      for (const dep of task.dependencies) { await execute(dep); }
      task.status = "running"; this.emit("taskStarted", { id });
      try { await task.handler(); task.status = "completed"; executed.add(id); this.emit("taskCompleted", { id }); }
      catch (e) {
        if (task.retries < task.maxRetries) {
          task.retries++; await new Promise(r => setTimeout(r, task.backoffMs * task.retries));
          await execute(id);
        } else { task.status = "failed"; this.emit("taskFailed", { id, error: e }); throw e; }
      }
    };
    for (const id of this.tasks.keys()) await execute(id);
  }
  getStatus() { return Array.from(this.tasks.entries()).map(([id, t]) => ({ id, status: t.status, retries: t.retries })); }
  reset(): void { for (const [, t] of this.tasks) { t.status = "pending"; t.retries = 0; } }
}
