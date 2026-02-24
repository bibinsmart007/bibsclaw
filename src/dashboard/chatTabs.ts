// Chat Tabs - Phase 4.1: Multiple conversations
export interface ChatTab {
  id: string;
  title: string;
  messages: Array<{ role: string; content: string; timestamp: Date }>;
  model: string;
  active: boolean;
  createdAt: Date;
}

export class ChatTabManager {
  private tabs: ChatTab[] = [];
  private activeId: string | null = null;

  create(title: string, model: string): ChatTab {
    const tab: ChatTab = { id: Date.now().toString(36), title, messages: [], model, active: false, createdAt: new Date() };
    this.tabs.push(tab);
    this.setActive(tab.id);
    return tab;
  }

  setActive(id: string): void {
    this.tabs.forEach(t => (t.active = t.id === id));
    this.activeId = id;
  }

  close(id: string): void {
    this.tabs = this.tabs.filter(t => t.id !== id);
    if (this.activeId === id && this.tabs.length > 0) this.setActive(this.tabs[0].id);
  }

  getActive(): ChatTab | undefined { return this.tabs.find(t => t.active); }
  getAll(): ChatTab[] { return [...this.tabs]; }
}
