import crypto from "node:crypto";
import { appConfig } from "../config.js";

export interface AuthUser {
  id: string;
  username: string;
  role: "admin" | "user";
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  expiresAt: Date;
  createdAt: Date;
}

export class AuthManager {
  private sessions: Map<string, AuthSession> = new Map();
  private readonly tokenExpiry = 24 * 60 * 60 * 1000; // 24 hours

  get enabled(): boolean {
    return appConfig.auth?.enabled ?? false;
  }

  generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  createSession(user: AuthUser): AuthSession {
    // Clean expired sessions first
    this.cleanExpired();

    const token = this.generateToken();
    const session: AuthSession = {
      token,
      user,
      expiresAt: new Date(Date.now() + this.tokenExpiry),
      createdAt: new Date(),
    };
    this.sessions.set(token, session);
    return session;
  }

  validateToken(token: string): AuthSession | null {
    const session = this.sessions.get(token);
    if (!session) return null;
    if (new Date() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }
    return session;
  }

  revokeToken(token: string): boolean {
    return this.sessions.delete(token);
  }

  refreshSession(token: string): AuthSession | null {
    const session = this.validateToken(token);
    if (!session) return null;
    session.expiresAt = new Date(Date.now() + this.tokenExpiry);
    return session;
  }

  validateCredentials(username: string, password: string): AuthUser | null {
    const adminUser = appConfig.auth?.adminUser ?? "admin";
    const adminPass = appConfig.auth?.adminPassword ?? "";
    if (!adminPass) return null;
    if (username === adminUser && password === adminPass) {
      return { id: "admin-1", username: adminUser, role: "admin" };
    }
    return null;
  }

  private cleanExpired(): void {
    const now = new Date();
    for (const [token, session] of this.sessions) {
      if (now > session.expiresAt) {
        this.sessions.delete(token);
      }
    }
  }

  getActiveSessions(): number {
    this.cleanExpired();
    return this.sessions.size;
  }
}
