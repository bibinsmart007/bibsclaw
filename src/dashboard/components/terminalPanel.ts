import { EventEmitter } from "events";
import { spawn, ChildProcess } from "child_process";

export interface TerminalLine {
  id: string;
  type: "input" | "output" | "error" | "system";
  content: string;
  timestamp: Date;
}

export interface TerminalSession {
  id: string;
  name: string;
  lines: TerminalLine[];
  process: ChildProcess | null;
  cwd: string;
  isActive: boolean;
  createdAt: Date;
}

export class TerminalPanel extends EventEmitter {
  private sessions: Map<string, TerminalSession> = new Map();
  private activeSessionId: string | null = null;
  private maxLines: number = 5000;
  private commandHistory: string[] = [];
  private historyIndex: number = -1;

  constructor() {
    super();
  }

  createSession(name?: string, cwd?: string): TerminalSession {
    const id = "term_" + Date.now().toString(36);
    const session: TerminalSession = {
      id, name: name || "Terminal " + (this.sessions.size + 1),
      lines: [], process: null, cwd: cwd || process.cwd(),
      isActive: false, createdAt: new Date(),
    };
    this.sessions.set(id, session);
    this.setActiveSession(id);
    this.addLine(id, "system", "Session started: " + session.name);
    this.emit("sessionCreated", session);
    return session;
  }

  async executeCommand(sessionId: string, command: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("Session not found");
    this.commandHistory.push(command);
    this.historyIndex = this.commandHistory.length;
    this.addLine(sessionId, "input", "$ " + command);
    return new Promise((resolve) => {
      const child = spawn(command, {
        shell: true, cwd: session.cwd,
        env: { ...process.env, FORCE_COLOR: "1" },
      });
      session.process = child;
      child.stdout?.on("data", (data: Buffer) => {
        this.addLine(sessionId, "output", data.toString());
      });
      child.stderr?.on("data", (data: Buffer) => {
        this.addLine(sessionId, "error", data.toString());
      });
      child.on("close", (code: number | null) => {
        session.process = null;
        this.addLine(sessionId, "system", "Process exited with code " + String(code));
        this.emit("commandComplete", { sessionId, command, exitCode: code });
        resolve();
      });
    });
  }

  private addLine(sessionId: string, type: TerminalLine["type"], content: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    const line: TerminalLine = {
      id: "line_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 4),
      type, content, timestamp: new Date(),
    };
    session.lines.push(line);
    if (session.lines.length > this.maxLines) {
      session.lines = session.lines.slice(-this.maxLines);
    }
    this.emit("lineAdded", { sessionId, line });
  }

  killProcess(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session?.process) {
      session.process.kill("SIGTERM");
      this.addLine(sessionId, "system", "Process terminated");
    }
  }

  setActiveSession(id: string): void {
    if (this.activeSessionId) {
      const prev = this.sessions.get(this.activeSessionId);
      if (prev) prev.isActive = false;
    }
    this.activeSessionId = id;
    const session = this.sessions.get(id);
    if (session) session.isActive = true;
    this.emit("sessionActivated", id);
  }

  getActiveSession(): TerminalSession | null {
    return this.activeSessionId ? this.sessions.get(this.activeSessionId) || null : null;
  }

  getAllSessions(): TerminalSession[] {
    return Array.from(this.sessions.values());
  }

  closeSession(id: string): void {
    const session = this.sessions.get(id);
    if (session?.process) session.process.kill("SIGTERM");
    this.sessions.delete(id);
    if (this.activeSessionId === id) {
      const keys = Array.from(this.sessions.keys());
      this.activeSessionId = keys.length > 0 ? keys[keys.length - 1] : null;
    }
    this.emit("sessionClosed", id);
  }

  clearSession(id: string): void {
    const session = this.sessions.get(id);
    if (session) { session.lines = []; this.emit("sessionCleared", id); }
  }

  getPreviousCommand(): string | null {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      return this.commandHistory[this.historyIndex] || null;
    }
    return null;
  }

  getNextCommand(): string | null {
    if (this.historyIndex < this.commandHistory.length - 1) {
      this.historyIndex++;
      return this.commandHistory[this.historyIndex] || null;
    }
    this.historyIndex = this.commandHistory.length;
    return null;
  }

  searchHistory(query: string): string[] {
    return this.commandHistory.filter(c => c.includes(query));
  }
}

export const terminalPanel = new TerminalPanel();
