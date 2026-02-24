// Quick Action Widgets - Phase 4.3
export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  command: string;
  color: string;
}

export class QuickActionManager {
  private actions: QuickAction[] = [
    { id: 'deploy', label: 'Deploy', icon: 'rocket', command: '/deploy', color: '#22c55e' },
    { id: 'status', label: 'Status', icon: 'activity', command: '/status', color: '#3b82f6' },
    { id: 'tests', label: 'Run Tests', icon: 'check-circle', command: '/test', color: '#a855f7' },
    { id: 'chat', label: 'Quick Chat', icon: 'message-circle', command: '/chat', color: '#f59e0b' },
  ];
  getActions(): QuickAction[] { return [...this.actions]; }
  addAction(action: QuickAction): void { this.actions.push(action); }
  removeAction(id: string): void { this.actions = this.actions.filter(a => a.id !== id); }
}
