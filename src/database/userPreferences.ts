// User Preferences - Phase 1
// Manages user-specific settings and preferences

export interface UserPreference {
  userId: string;
  key: string;
  value: unknown;
  updatedAt: Date;
}

export interface PreferenceSchema {
  theme: "light" | "dark" | "system";
  language: string;
  timezone: string;
  notifications: boolean;
  emailDigest: "daily" | "weekly" | "never";
  defaultView: "grid" | "list" | "kanban";
  itemsPerPage: number;
  autoSave: boolean;
}

const DEFAULT_PREFERENCES: PreferenceSchema = {
  theme: "system",
  language: "en",
  timezone: "UTC",
  notifications: true,
  emailDigest: "weekly",
  defaultView: "list",
  itemsPerPage: 25,
  autoSave: true,
};

export class UserPreferencesManager {
  private preferences: Map<string, Map<string, UserPreference>> = new Map();

  async getPreference<K extends keyof PreferenceSchema>(userId: string, key: K): Promise<PreferenceSchema[K]> {
    const userPrefs = this.preferences.get(userId);
    if (userPrefs && userPrefs.has(key)) {
      return userPrefs.get(key)!.value as PreferenceSchema[K];
    }
    return DEFAULT_PREFERENCES[key];
  }

  async setPreference<K extends keyof PreferenceSchema>(userId: string, key: K, value: PreferenceSchema[K]): Promise<void> {
    if (!this.preferences.has(userId)) {
      this.preferences.set(userId, new Map());
    }
    this.preferences.get(userId)!.set(key, {
      userId,
      key,
      value,
      updatedAt: new Date(),
    });
  }

  async getAllPreferences(userId: string): Promise<PreferenceSchema> {
    const result = { ...DEFAULT_PREFERENCES };
    const userPrefs = this.preferences.get(userId);
    if (userPrefs) {
      for (const [key, pref] of userPrefs) {
        (result as Record<string, unknown>)[key] = pref.value;
      }
    }
    return result;
  }

  async resetPreferences(userId: string): Promise<void> {
    this.preferences.delete(userId);
  }

  async exportPreferences(userId: string): Promise<string> {
    const prefs = await this.getAllPreferences(userId);
    return JSON.stringify(prefs, null, 2);
  }

  async importPreferences(userId: string, json: string): Promise<void> {
    const prefs = JSON.parse(json) as Partial<PreferenceSchema>;
    for (const [key, value] of Object.entries(prefs)) {
      if (key in DEFAULT_PREFERENCES) {
        await this.setPreference(userId, key as keyof PreferenceSchema, value as PreferenceSchema[keyof PreferenceSchema]);
      }
    }
  }
}
