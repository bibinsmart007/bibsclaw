import { EventEmitter } from "events";

export interface ChatTab {
  id: string;
  title: string;
  model: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  isPinned: boolean;
  isActive: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
  timestamp: Date;
  tokens?: number;
  cost?: number;
  attachments?: FileAttachment[];
}

export interface FileAttachment {
  name: string;
  type: string;
  size: number;
  url?: string;
}

export class ChatTabManager extends EventEmitter {
  private tabs: Map<string, ChatTab> = new Map();
  private activeTabId: string | null = null;
  private maxTabs: number = 20;

  constructor() {
    super();
  }

  createTab(title?: string, model?: string): ChatTab {
    if (this.tabs.size >= this.maxTabs) {
      throw new Error("Maximum tab limit reached: " + String(this.maxTabs));
    }
    const id = "tab_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const tab: ChatTab = {
      id,
      title: title || "New Chat",
      model: model || "auto",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isPinned: false,
      isActive: false,
    };
    this.tabs.set(id, tab);
    this.setActiveTab(id);
    this.emit("tabCreated", tab);
    return tab;
  }

  closeTab(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    if (tab.isPinned) {
      throw new Error("Cannot close pinned tab");
    }
    this.tabs.delete(tabId);
    if (this.activeTabId === tabId) {
      const remaining = Array.from(this.tabs.keys());
      this.activeTabId = remaining.length > 0 ? remaining[remaining.length - 1] : null;
    }
    this.emit("tabClosed", tabId);
  }

  setActiveTab(tabId: string): void {
    if (!this.tabs.has(tabId)) return;
    if (this.activeTabId) {
      const prev = this.tabs.get(this.activeTabId);
      if (prev) prev.isActive = false;
    }
    this.activeTabId = tabId;
    const tab = this.tabs.get(tabId);
    if (tab) tab.isActive = true;
    this.emit("tabActivated", tabId);
  }

  getActiveTab(): ChatTab | null {
    return this.activeTabId ? this.tabs.get(this.activeTabId) || null : null;
  }

  getAllTabs(): ChatTab[] {
    return Array.from(this.tabs.values());
  }

  addMessage(tabId: string, message: Omit<ChatMessage, "id" | "timestamp">): ChatMessage {
    const tab = this.tabs.get(tabId);
    if (!tab) throw new Error("Tab not found: " + tabId);
    const msg: ChatMessage = {
      ...message,
      id: "msg_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: new Date(),
    };
    tab.messages.push(msg);
    tab.updatedAt = new Date();
    if (tab.messages.length === 1 && message.role === "user") {
      tab.title = message.content.slice(0, 40) + (message.content.length > 40 ? "..." : "");
    }
    this.emit("messageAdded", { tabId, message: msg });
    return msg;
  }

  pinTab(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.isPinned = !tab.isPinned;
      this.emit("tabPinned", { tabId, isPinned: tab.isPinned });
    }
  }

  renameTab(tabId: string, title: string): void {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.title = title;
      this.emit("tabRenamed", { tabId, title });
    }
  }

  getTabCount(): number {
    return this.tabs.size;
  }

  exportTab(tabId: string): string {
    const tab = this.tabs.get(tabId);
    if (!tab) throw new Error("Tab not found");
    return JSON.stringify(tab, null, 2);
  }

  clearMessages(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.messages = [];
      tab.updatedAt = new Date();
      this.emit("messagesCleared", tabId);
    }
  }
}

export const chatTabManager = new ChatTabManager();
