import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

interface Session {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  createdAt: number;
  lastActivity: number;
}

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private readonly accessTTL = 15 * 60 * 1000;
  private readonly refreshTTL = 7 * 24 * 60 * 60 * 1000;
  private readonly storePath: string;

  constructor(storePath = ".bibsclaw/sessions.json") {
    this.storePath = storePath;
    this.loadSessions();
  }

  createSession(userId: string): { accessToken: string; refreshToken: string } {
    const id = crypto.randomUUID();
    const accessToken = crypto.randomBytes(32).toString("hex");
    const refreshToken = crypto.randomBytes(48).toString("hex");
    const now = Date.now();
    const session: Session = {
      id, userId, accessToken, refreshToken,
      expiresAt: now + this.accessTTL,
      createdAt: now, lastActivity: now,
    };
    this.sessions.set(accessToken, session);
    this.persist();
    return { accessToken, refreshToken };
  }

  validate(accessToken: string): Session | null {
    const session = this.sessions.get(accessToken);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(accessToken);
      this.persist();
      return null;
    }
    session.lastActivity = Date.now();
    return session;
  }

  refresh(refreshToken: string): { accessToken: string; refreshToken: string } | null {
    for (const [key, session] of this.sessions.entries()) {
      if (session.refreshToken === refreshToken) {
        if (Date.now() > session.createdAt + this.refreshTTL) {
          this.sessions.delete(key);
          this.persist();
          return null;
        }
        this.sessions.delete(key);
        return this.createSession(session.userId);
      }
    }
    return null;
  }

  revoke(accessToken: string): void {
    this.sessions.delete(accessToken);
    this.persist();
  }

  revokeAll(userId: string): void {
    for (const [key, session] of this.sessions.entries()) {
      if (session.userId === userId) this.sessions.delete(key);
    }
    this.persist();
  }

  cleanup(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(key);
        removed++;
      }
    }
    if (removed > 0) this.persist();
    return removed;
  }

  private persist(): void {
    const dir = path.dirname(this.storePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const data = Object.fromEntries(this.sessions);
    fs.writeFileSync(this.storePath, JSON.stringify(data, null, 2), "utf-8");
  }

  private loadSessions(): void {
    if (fs.existsSync(this.storePath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(this.storePath, "utf-8"));
        for (const [k, v] of Object.entries(raw)) {
          this.sessions.set(k, v as Session);
        }
      } catch { /* corrupt file, start fresh */ }
    }
  }
}
