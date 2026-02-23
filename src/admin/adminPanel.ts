// Admin Panel - Phase 4
// Provides administrative interface for system management

export interface AdminUser {
  id: string;
  email: string;
  role: "super_admin" | "admin" | "moderator";
  permissions: string[];
  lastLogin: Date | null;
}

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalTasks: number;
  completedTasks: number;
  systemUptime: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface AdminAction {
  id: string;
  adminId: string;
  action: string;
  target: string;
  timestamp: Date;
  details: Record<string, unknown>;
}

export class AdminPanel {
  private admins: Map<string, AdminUser> = new Map();
  private actionLog: AdminAction[] = [];

  async getSystemStats(): Promise<SystemStats> {
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalTasks: 0,
      completedTasks: 0,
      systemUptime: process.uptime(),
      memoryUsage: process.memoryUsage().heapUsed,
      cpuUsage: 0,
    };
  }

  async addAdmin(user: AdminUser): Promise<void> {
    this.admins.set(user.id, user);
    await this.logAction(user.id, "admin_added", user.id, { role: user.role });
  }

  async removeAdmin(adminId: string, removedBy: string): Promise<boolean> {
    const removed = this.admins.delete(adminId);
    if (removed) {
      await this.logAction(removedBy, "admin_removed", adminId, {});
    }
    return removed;
  }

  async hasPermission(adminId: string, permission: string): Promise<boolean> {
    const admin = this.admins.get(adminId);
    if (!admin) return false;
    if (admin.role === "super_admin") return true;
    return admin.permissions.includes(permission);
  }

  async getActionLog(limit: number = 100): Promise<AdminAction[]> {
    return this.actionLog.slice(-limit);
  }

  private async logAction(adminId: string, action: string, target: string, details: Record<string, unknown>): Promise<void> {
    this.actionLog.push({
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
      adminId,
      action,
      target,
      timestamp: new Date(),
      details,
    });
  }
}
