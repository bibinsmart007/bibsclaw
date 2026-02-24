export interface UserPreferences {
  userId: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: { email: boolean; push: boolean; telegram: boolean };
  defaultModel: string;
  voiceEnabled: boolean;
  ttsVoice: string;
  dashboardLayout: string;
  autoSave: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_PREFERENCES: Omit<UserPreferences, 'userId' | 'createdAt' | 'updatedAt'> = {
  theme: 'system',
  language: 'en',
  timezone: 'UTC',
  notifications: { email: true, push: true, telegram: false },
  defaultModel: 'perplexity',
  voiceEnabled: false,
  ttsVoice: 'default',
  dashboardLayout: 'standard',
  autoSave: true,
};

export class UserPreferencesStore {
  private store: Map<string, UserPreferences> = new Map();

  async get(userId: string): Promise<UserPreferences> {
    if (!this.store.has(userId)) {
      const now = new Date();
      this.store.set(userId, { ...DEFAULT_PREFERENCES, userId, createdAt: now, updatedAt: now });
    }
    return this.store.get(userId)!;
  }

  async update(userId: string, updates: Partial<Omit<UserPreferences, 'userId' | 'createdAt' | 'updatedAt'>>): Promise<UserPreferences> {
    const current = await this.get(userId);
    const updated = { ...current, ...updates, updatedAt: new Date() };
    if (updates.notifications) {
      updated.notifications = { ...current.notifications, ...updates.notifications };
    }
    this.store.set(userId, updated);
    return updated;
  }

  async reset(userId: string): Promise<UserPreferences> {
    const now = new Date();
    const prefs = { ...DEFAULT_PREFERENCES, userId, createdAt: now, updatedAt: now };
    this.store.set(userId, prefs);
    return prefs;
  }

  async delete(userId: string): Promise<boolean> {
    return this.store.delete(userId);
  }

  async getAll(): Promise<UserPreferences[]> {
    return Array.from(this.store.values());
  }

  async exportPreferences(userId: string): Promise<string> {
    const prefs = await this.get(userId);
    return JSON.stringify(prefs, null, 2);
  }

  async importPreferences(userId: string, json: string): Promise<UserPreferences> {
    const imported = JSON.parse(json) as Partial<UserPreferences>;
    const { userId: _, createdAt, updatedAt, ...updates } = imported;
    return this.update(userId, updates);
  }
}

export const userPreferencesStore = new UserPreferencesStore();
