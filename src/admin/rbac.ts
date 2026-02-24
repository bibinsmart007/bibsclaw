// Role-Based Access Control - Phase 4.4
export type Role = 'admin' | 'editor' | 'viewer' | 'guest';

export interface Permission {
  resource: string;
  actions: Array<'read' | 'write' | 'delete' | 'admin'>;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt: Date;
}

export class RBACManager {
  private rolePermissions: Map<Role, Permission[]> = new Map([
    ['admin', [{ resource: '*', actions: ['read', 'write', 'delete', 'admin'] }]],
    ['editor', [{ resource: 'chat', actions: ['read', 'write'] }, { resource: 'tasks', actions: ['read', 'write'] }]],
    ['viewer', [{ resource: 'chat', actions: ['read'] }, { resource: 'tasks', actions: ['read'] }]],
    ['guest', [{ resource: 'chat', actions: ['read'] }]],
  ]);

  hasPermission(role: Role, resource: string, action: 'read' | 'write' | 'delete' | 'admin'): boolean {
    const perms = this.rolePermissions.get(role) || [];
    return perms.some(p => (p.resource === '*' || p.resource === resource) && p.actions.includes(action));
  }

  getRolePermissions(role: Role): Permission[] { return this.rolePermissions.get(role) || []; }
}
