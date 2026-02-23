import { describe, it, expect, beforeEach } from "vitest";
import { AuthManager } from "../auth/auth.js";

// Mock appConfig for tests
import { vi } from "vitest";
vi.mock("../config.js", () => ({
  appConfig: {
    auth: {
      enabled: true,
      adminUser: "admin",
      adminPassword: "testpass123",
    },
  },
}));

describe("AuthManager", () => {
  let auth: AuthManager;

  beforeEach(() => {
    auth = new AuthManager();
  });

  it("should generate unique tokens", () => {
    const token1 = auth.generateToken();
    const token2 = auth.generateToken();
    expect(token1).not.toBe(token2);
    expect(token1).toHaveLength(64);
  });

  it("should create and validate sessions", () => {
    const user = { id: "1", username: "admin", role: "admin" as const };
    const session = auth.createSession(user);
    expect(session.token).toBeDefined();
    expect(session.user.username).toBe("admin");

    const validated = auth.validateToken(session.token);
    expect(validated).not.toBeNull();
    expect(validated?.user.id).toBe("1");
  });

  it("should reject invalid tokens", () => {
    const result = auth.validateToken("invalid-token");
    expect(result).toBeNull();
  });

  it("should revoke tokens", () => {
    const user = { id: "1", username: "admin", role: "admin" as const };
    const session = auth.createSession(user);
    expect(auth.validateToken(session.token)).not.toBeNull();

    auth.revokeToken(session.token);
    expect(auth.validateToken(session.token)).toBeNull();
  });

  it("should validate correct credentials", () => {
    const user = auth.validateCredentials("admin", "testpass123");
    expect(user).not.toBeNull();
    expect(user?.username).toBe("admin");
  });

  it("should reject wrong credentials", () => {
    const user = auth.validateCredentials("admin", "wrongpass");
    expect(user).toBeNull();
  });

  it("should track active sessions", () => {
    const user = { id: "1", username: "admin", role: "admin" as const };
    auth.createSession(user);
    auth.createSession(user);
    expect(auth.getActiveSessions()).toBe(2);
  });

  it("should refresh sessions", () => {
    const user = { id: "1", username: "admin", role: "admin" as const };
    const session = auth.createSession(user);
    const originalExpiry = session.expiresAt;

    const refreshed = auth.refreshSession(session.token);
    expect(refreshed).not.toBeNull();
    expect(refreshed!.expiresAt.getTime()).toBeGreaterThanOrEqual(originalExpiry.getTime());
  });
});
