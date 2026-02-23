import { EventEmitter } from "events";

export type UserRole = "owner" | "admin" | "developer" | "analyst" | "viewer";

export interface Permission {
  resource: string;
  actions: ("read" | "write" | "delete" | "execute" | "manage")[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
  avatarUrl?: string;
  preferences: Record<string, unknown>;
  quota?: UserQuota;
}

export interface UserQuota {
  dailyMessages: number;
  monthlyTokens: number;
  maxTasks: number;
  maxFileSize: number;
  usedMessages: number;
  usedTokens: number;
  activeTasks: number;
  resetAt: Date;
}

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [{ resource: "*", actions: ["read", "write", "delete", "execute", "manage"] }],
  admin: [
    { resource: "users", actions: ["read", "write", "delete", "manage"] },
    { resource: "tasks", actions: ["read", "write", "delete", "execute"] },
    { resource: "analytics", actions: ["read", "manage"] },
    { resource: "settings", actions: ["read", "write", "manage"] },
    { resource: "chat", actions: ["read", "write", "delete"] },
    { resource: "files", actions: ["read", "write", "delete"] },
  ],
  developer: [
    { resource: "tasks", actions: ["read", "write", "execute"] },
    { resource: "chat", actions: ["read", "write"] },
    { resource: "files", actions: ["read", "write"] },
    { resource: "analytics", actions: ["read"] },
    { resource: "terminal", actions: ["read", "write", "execute"] },
  ],
  analyst: [
    { resource: "analytics", actions: ["read"] },
    { resource: "chat", actions: ["read", "write"] },
    { resource: "tasks", actions: ["read"] },
    { resource: "files", actions: ["read"] },
  ],
  viewer: [
    { resource: "chat", actions: ["read"] },
    { resource: "analytics", actions: ["read"] },
    { resource: "tasks", actions: ["read"] },
  ],
};

export class RBACManager extends EventEmitter {
  private users: Map<string, User> = new Map();
  private sessions: Map<string, { userId: string; createdAt: Date; expiresAt: Date }> = new Map();

  constructor() {
    super();
    this.createDefaultOwner();
  }

  private createDefaultOwner(): void {
    const owner: User = {
      id: "owner_bibin",
      username: "bibin",
      email: "bibin@bibsclaw.ai",
      role: "owner",
      permissions: ROLE_PERMISSIONS.owner,
      createdAt: new Date(),
      isActive: true,
      preferences: { theme: "dark", language: "en" },
    };
    this.users.set(owner.id, owner);
  }

  createUser(username: string, email: string, role: UserRole): User {
    if (Array.from(this.users.values()).some(u => u.email === email)) {
      throw new Error("Email already exists: " + email);
    }
    const user: User = {
      id: "user_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      username, email, role,
      permissions: [...ROLE_PERMISSIONS[role]],
      createdAt: new Date(),
      isActive: true,
      preferences: {},
    };
    this.users.set(user.id, user);
    this.emit("userCreated", user);
    return user;
  }

  updateRole(userId: string, newRole: UserRole): void {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    const oldRole = user.role;
    user.role = newRole;
    user.permissions = [...ROLE_PERMISSIONS[newRole]];
    this.emit("roleChanged", { userId, oldRole, newRole });
  }

  hasPermission(userId: string, resource: string, action: Permission["actions"][0]): boolean {
    const user = this.users.get(userId);
    if (!user || !user.isActive) return false;
    return user.permissions.some(p => {
      const resourceMatch = p.resource === "*" || p.resource === resource;
      const actionMatch = p.actions.includes(action) || p.actions.includes("manage");
      return resourceMatch && actionMatch;
    });
  }

  getUser(userId: string): User | null {
    return this.users.get(userId) || null;
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  deactivateUser(userId: string): void {
    const user = this.users.get(userId);
    if (user) { user.isActive = false; this.emit("userDeactivated", userId); }
  }

  activateUser(userId: string): void {
    const user = this.users.get(userId);
    if (user) { user.isActive = true; this.emit("userActivated", userId); }
  }

  getUsersByRole(role: UserRole): User[] {
    return Array.from(this.users.values()).filter(u => u.role === role);
  }

  getRolePermissions(role: UserRole): Permission[] {
    return [...ROLE_PERMISSIONS[role]];
  }

  updatePreferences(userId: string, prefs: Record<string, unknown>): void {
    const user = this.users.get(userId);
    if (user) { user.preferences = { ...user.preferences, ...prefs }; this.emit("preferencesUpdated", { userId, prefs }); }
  }

  getUserCount(): number { return this.users.size; }
  getActiveUserCount(): number { return Array.from(this.users.values()).filter(u => u.isActive).length; }
}

export const rbacManager = new RBACManager();
