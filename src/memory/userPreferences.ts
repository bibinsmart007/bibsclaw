import { logger } from "../middleware/logger.js";
import fs from "node:fs";
import path from "node:path";

const PREFS_FILE = path.join(process.cwd(), ".bibsclaw", "user_preferences.json");

export interface UserPreferences {
  preferredModel?: string;
  preferredLanguage?: string;
  preferredVoice?: string;
  codeStyle?: { indent: number; quotes: "single" | "double"; semicolons: boolean };
  responseStyle?: "concise" | "detailed" | "casual";
  customPrefs: Record<string, any>;
  history: Array<{ key: string; value: any; timestamp: number }>;
}

let prefs: UserPreferences = { customPrefs: {}, history: [] };

export function loadPreferences(): UserPreferences {
  try {
    if (fs.existsSync(PREFS_FILE)) prefs = JSON.parse(fs.readFileSync(PREFS_FILE, "utf-8"));
  } catch (e) { logger.warn("Failed to load preferences"); }
  return prefs;
}

export function savePreferences(): void {
  fs.mkdirSync(path.dirname(PREFS_FILE), { recursive: true });
  fs.writeFileSync(PREFS_FILE, JSON.stringify(prefs, null, 2));
}

export function setPreference(key: string, value: any): void {
  (prefs as any)[key] !== undefined ? (prefs as any)[key] = value : prefs.customPrefs[key] = value;
  prefs.history.push({ key, value, timestamp: Date.now() });
  if (prefs.history.length > 100) prefs.history = prefs.history.slice(-100);
  savePreferences();
  logger.info(`Preference set: ${key} = ${JSON.stringify(value)}`);
}

export function getPreference(key: string): any {
  return (prefs as any)[key] !== undefined ? (prefs as any)[key] : prefs.customPrefs[key];
}

export function learnFromInteraction(interaction: { query: string; model: string; liked: boolean }): void {
  if (interaction.liked) {
    const modelCounts: Record<string, number> = prefs.customPrefs._modelSuccess || {};
    modelCounts[interaction.model] = (modelCounts[interaction.model] || 0) + 1;
    prefs.customPrefs._modelSuccess = modelCounts;
    savePreferences();
  }
}

export function getRecommendedModel(): string | undefined {
  const counts: Record<string, number> = prefs.customPrefs._modelSuccess || {};
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0];
}
