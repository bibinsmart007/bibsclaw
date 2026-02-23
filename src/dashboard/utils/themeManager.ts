import { EventEmitter } from "events";

export type ThemeMode = "light" | "dark" | "system";

export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  fontSize: "small" | "medium" | "large";
  borderRadius: "none" | "small" | "medium" | "large";
  animations: boolean;
}

const DEFAULT_THEME: ThemeConfig = {
  mode: "dark",
  primaryColor: "#6366f1",
  accentColor: "#22d3ee",
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: "medium",
  borderRadius: "medium",
  animations: true,
};

export class ThemeManager extends EventEmitter {
  private config: ThemeConfig;
  private mediaQuery: MediaQueryList | null = null;

  constructor(initialConfig?: Partial<ThemeConfig>) {
    super();
    this.config = { ...DEFAULT_THEME, ...initialConfig };
  }

  getConfig(): ThemeConfig {
    return { ...this.config };
  }

  setMode(mode: ThemeMode): void {
    this.config.mode = mode;
    this.emit("themeChange", this.getResolvedTheme());
  }

  getResolvedTheme(): "light" | "dark" {
    if (this.config.mode === "system") {
      return this.getSystemPreference();
    }
    return this.config.mode as "light" | "dark";
  }

  private getSystemPreference(): "light" | "dark" {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "dark";
  }

  updateConfig(updates: Partial<ThemeConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit("themeChange", this.getResolvedTheme());
  }

  getCSSVariables(): Record<string, string> {
    const isDark = this.getResolvedTheme() === "dark";
    return {
      "--bg-primary": isDark ? "#0f172a" : "#ffffff",
      "--bg-secondary": isDark ? "#1e293b" : "#f8fafc",
      "--bg-tertiary": isDark ? "#334155" : "#e2e8f0",
      "--text-primary": isDark ? "#f1f5f9" : "#0f172a",
      "--text-secondary": isDark ? "#94a3b8" : "#64748b",
      "--border-color": isDark ? "#334155" : "#e2e8f0",
      "--accent-color": this.config.primaryColor,
      "--accent-hover": this.config.accentColor,
      "--font-family": this.config.fontFamily,
      "--shadow": isDark ? "0 4px 6px rgba(0,0,0,0.4)" : "0 4px 6px rgba(0,0,0,0.1)",
    };
  }

  serialize(): string {
    return JSON.stringify(this.config);
  }

  static deserialize(data: string): ThemeManager {
    const config = JSON.parse(data) as ThemeConfig;
    return new ThemeManager(config);
  }
}

export const themeManager = new ThemeManager();
