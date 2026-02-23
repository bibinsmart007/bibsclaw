import { EventEmitter } from "events";

export interface ErrorEvent {
  error: Error;
  context: string;
  timestamp: number;
  handled: boolean;
}

export class GlobalErrorBoundary extends EventEmitter {
  private readonly errors: ErrorEvent[] = [];
  private readonly maxHistory = 100;

  install(): void {
    process.on("uncaughtException", (err) => {
      this.capture(err, "uncaughtException");
    });
    process.on("unhandledRejection", (reason) => {
      const err = reason instanceof Error ? reason : new Error(String(reason));
      this.capture(err, "unhandledRejection");
    });
  }

  capture(error: Error, context = "unknown"): void {
    const event: ErrorEvent = { error, context, timestamp: Date.now(), handled: false };
    this.errors.push(event);
    if (this.errors.length > this.maxHistory) this.errors.shift();
    this.emit("error", event);
    console.error(`[ErrorBoundary] ${context}: ${error.message}`);
  }

  async wrap<T>(fn: () => Promise<T>, context: string): Promise<T | null> {
    try {
      return await fn();
    } catch (err) {
      this.capture(err instanceof Error ? err : new Error(String(err)), context);
      return null;
    }
  }

  getHistory(): ErrorEvent[] { return [...this.errors]; }
  clearHistory(): void { this.errors.length = 0; }
}

export const errorBoundary = new GlobalErrorBoundary();
