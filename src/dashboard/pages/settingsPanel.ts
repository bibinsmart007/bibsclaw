import { EventEmitter } from "events";

export interface AppSettings {
  general: GeneralSettings;
  ai: AISettings;
  voice: VoiceSettings;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  advanced: AdvancedSettings;
}

export interface GeneralSettings {
  appName: string;
  timezone: string;
  language: string;
  dateFormat: string;
  autoSave: boolean;
  startupTab: string;
  maxChatHistory: number;
}

export interface AISettings {
  defaultModel: string;
  fallbackModel: string;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
  enableMemory: boolean;
  enableRAG: boolean;
  costWarningThreshold: number;
  autoRouting: boolean;
}

export interface VoiceSettings {
  enabled: boolean;
  wakeWord: string;
  language: string;
  ttsProvider: string;
  ttsVoice: string;
  sttProvider: string;
  volume: number;
  speed: number;
  continuousMode: boolean;
}

export interface NotificationSettings {
  browserPush: boolean;
  taskComplete: boolean;
  chatReply: boolean;
  systemAlerts: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  sound: boolean;
}

export interface PrivacySettings {
  telemetryEnabled: boolean;
  saveConversations: boolean;
  shareDataForImprovement: boolean;
  dataRetentionDays: number;
  encryptLocalData: boolean;
}

export interface AdvancedSettings {
  debugMode: boolean;
  verboseLogging: boolean;
  maxConcurrentTasks: number;
  requestTimeout: number;
  retryAttempts: number;
  enableExperimentalFeatures: boolean;
  customCSS: string;
  webhookSecret: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  general: {
    appName: "BibsClaw",
    timezone: "Asia/Dubai",
    language: "en",
    dateFormat: "DD/MM/YYYY",
    autoSave: true,
    startupTab: "chat",
    maxChatHistory: 1000,
  },
  ai: {
    defaultModel: "auto",
    fallbackModel: "claude-3.5-sonnet",
    maxTokens: 8192,
    temperature: 0.7,
    systemPrompt: "You are BibsClaw, a powerful AI assistant built by Bibin from Abu Dhabi. You are helpful, accurate, and proactive.",
    enableMemory: true,
    enableRAG: true,
    costWarningThreshold: 1.0,
    autoRouting: true,
  },
  voice: {
    enabled: true,
    wakeWord: "Hey BibsClaw",
    language: "en-US",
    ttsProvider: "elevenlabs",
    ttsVoice: "adam",
    sttProvider: "whisper",
    volume: 0.8,
    speed: 1.0,
    continuousMode: false,
  },
  notifications: {
    browserPush: true,
    taskComplete: true,
    chatReply: false,
    systemAlerts: true,
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
    sound: true,
  },
  privacy: {
    telemetryEnabled: false,
    saveConversations: true,
    shareDataForImprovement: false,
    dataRetentionDays: 365,
    encryptLocalData: false,
  },
  advanced: {
    debugMode: false,
    verboseLogging: false,
    maxConcurrentTasks: 5,
    requestTimeout: 30000,
    retryAttempts: 3,
    enableExperimentalFeatures: false,
    customCSS: "",
    webhookSecret: "",
  },
};

export class SettingsPanel extends EventEmitter {
  private settings: AppSettings;
  private changeLog: { timestamp: Date; section: string; key: string; oldValue: unknown; newValue: unknown }[] = [];

  constructor(initial?: Partial<AppSettings>) {
    super();
    this.settings = this.deepMerge(DEFAULT_SETTINGS, initial || {}) as AppSettings;
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  get<T>(section: keyof AppSettings, key: string): T {
    return ((this.settings as any)[section])[key] as T;
  }

  set(section: keyof AppSettings, key: string, value: unknown): void {
    const sectionObj = (this.settings as any)[section];
    const oldValue = sectionObj[key];
    sectionObj[key] = value;
    this.changeLog.push({ timestamp: new Date(), section, key, oldValue, newValue: value });
    this.emit("changed", { section, key, value });
  }

  update(section: keyof AppSettings, updates: Record<string, unknown>): void {
    Object.entries(updates).forEach(([key, value]) => this.set(section, key, value));
  }

  getAll(): AppSettings {
    return JSON.parse(JSON.stringify(this.settings)) as AppSettings;
  }

  getSection<K extends keyof AppSettings>(section: K): AppSettings[K] {
    return JSON.parse(JSON.stringify(this.settings[section])) as AppSettings[K];
  }

  reset(section?: keyof AppSettings): void {
    if (section) {
      (this.settings as any)[section] = JSON.parse(JSON.stringify(DEFAULT_SETTINGS[section]));
    } else {
      this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as AppSettings;
    }
    this.emit("reset", section || "all");
  }

  export(): string {
    return JSON.stringify({ version: "4.0", settings: this.settings, exportedAt: new Date().toISOString() }, null, 2);
  }

  import(json: string): void {
    const data = JSON.parse(json);
    if (!data.settings) throw new Error("Invalid settings format");
    this.settings = this.deepMerge(DEFAULT_SETTINGS, data.settings) as AppSettings;
    this.emit("imported");
  }

  getChangeLog(): typeof this.changeLog {
    return [...this.changeLog];
  }
}

export const settingsPanel = new SettingsPanel();
