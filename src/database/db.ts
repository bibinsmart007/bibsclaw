import fs from "node:fs/promises";
import path from "node:path";
import { appConfig } from "../config.js";
import { logger } from "../middleware/logger.js";

export interface ChatRecord {
  id: number;
  role: string;
  content: string;
  provider: string;
  timestamp: string;
}

export interface TaskLogRecord {
  id: number;
  taskId: string;
  taskName: string;
  status: string;
  output: string;
  executedAt: string;
}

export class Database {
  private dbPath: string;
  private chatHistory: ChatRecord[] = [];
  private taskLogs: TaskLogRecord[] = [];
  private nextChatId = 1;
  private nextLogId = 1;
  private log = logger.child("database");

  constructor() {
    this.dbPath = path.join(appConfig.project.dir, ".bibsclaw");
  }

  async init(): Promise<void> {
    await fs.mkdir(this.dbPath, { recursive: true });
    await this.loadChatHistory();
    await this.loadTaskLogs();
    this.log.info("Database initialized", { path: this.dbPath });
  }

  // --- Chat History ---
  private async loadChatHistory(): Promise<void> {
    try {
      const data = await fs.readFile(path.join(this.dbPath, "chat_history.json"), "utf-8");
      this.chatHistory = JSON.parse(data);
      this.nextChatId = this.chatHistory.length > 0
        ? Math.max(...this.chatHistory.map(c => c.id)) + 1
        : 1;
    } catch {
      this.chatHistory = [];
    }
  }

  private async saveChatHistory(): Promise<void> {
    await fs.writeFile(
      path.join(this.dbPath, "chat_history.json"),
      JSON.stringify(this.chatHistory, null, 2)
    );
  }

  async addChatMessage(role: string, content: string, provider: string): Promise<ChatRecord> {
    const record: ChatRecord = {
      id: this.nextChatId++,
      role,
      content,
      provider,
      timestamp: new Date().toISOString(),
    };
    this.chatHistory.push(record);
    // Keep last 500 messages
    if (this.chatHistory.length > 500) {
      this.chatHistory = this.chatHistory.slice(-500);
    }
    await this.saveChatHistory().catch(e => this.log.error("Failed to save chat", { error: String(e) }));
    return record;
  }

  getChatHistory(limit = 50): ChatRecord[] {
    return this.chatHistory.slice(-limit);
  }

  async clearChatHistory(): Promise<void> {
    this.chatHistory = [];
    this.nextChatId = 1;
    await this.saveChatHistory();
  }

  // --- Task Logs ---
  private async loadTaskLogs(): Promise<void> {
    try {
      const data = await fs.readFile(path.join(this.dbPath, "task_logs.json"), "utf-8");
      this.taskLogs = JSON.parse(data);
      this.nextLogId = this.taskLogs.length > 0
        ? Math.max(...this.taskLogs.map(t => t.id)) + 1
        : 1;
    } catch {
      this.taskLogs = [];
    }
  }

  private async saveTaskLogs(): Promise<void> {
    await fs.writeFile(
      path.join(this.dbPath, "task_logs.json"),
      JSON.stringify(this.taskLogs, null, 2)
    );
  }

  async addTaskLog(taskId: string, taskName: string, status: string, output: string): Promise<TaskLogRecord> {
    const record: TaskLogRecord = {
      id: this.nextLogId++,
      taskId,
      taskName,
      status,
      output: output.slice(0, 1000),
      executedAt: new Date().toISOString(),
    };
    this.taskLogs.push(record);
    // Keep last 1000 logs
    if (this.taskLogs.length > 1000) {
      this.taskLogs = this.taskLogs.slice(-1000);
    }
    await this.saveTaskLogs().catch(e => this.log.error("Failed to save task log", { error: String(e) }));
    return record;
  }

  getTaskLogs(limit = 100): TaskLogRecord[] {
    return this.taskLogs.slice(-limit);
  }

  getTaskLogsByTaskId(taskId: string): TaskLogRecord[] {
    return this.taskLogs.filter(l => l.taskId === taskId);
  }
}
