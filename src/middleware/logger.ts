import fs from "node:fs";
import path from "node:path";
import { appConfig } from "../config.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private level: number;
  private logStream: fs.WriteStream | null = null;
  private context: string;

  constructor(context: string = "app") {
    this.context = context;
    this.level = LOG_LEVELS[appConfig.logging.level] ?? LOG_LEVELS.info;
    if (appConfig.logging.file) {
      const logPath = path.resolve(appConfig.project.dir, appConfig.logging.file);
      this.logStream = fs.createWriteStream(logPath, { flags: "a" });
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= this.level;
  }

  private formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? " " + JSON.stringify(meta) : "";
    return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}${metaStr}`;
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;
    const formatted = this.formatMessage(level, message, meta);
    // Write to console
    switch (level) {
      case "error":
        console.error(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }
    // Write to file
    if (this.logStream) {
      this.logStream.write(formatted + "\n");
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log("debug", message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log("info", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log("warn", message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log("error", message, meta);
  }

  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`);
  }

  close(): void {
    if (this.logStream) {
      this.logStream.end();
    }
  }
}

export const logger = new Logger();
