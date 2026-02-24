
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  borderRadius: string;
  customCSS: Record<string, string>;
}

export class ThemeProvider {
  private currentTheme: ThemeConfig;
  private listeners: Set<(theme: ThemeConfig) => void> = new Set();
  private mediaQuery: { matches: boolean } | null = null;

  constructor(initialTheme?: Partial<ThemeConfig>) {
    this.currentTheme = {
      mode: initialTheme?.mode || 'system',
      primaryColor: initialTheme?.primaryColor || '#3b82f6',
      accentColor: initialTheme?.accentColor || '#8b5cf6',
      fontFamily: initialTheme?.fontFamily || 'Inter, system-ui, sans-serif',
      borderRadius: initialTheme?.borderRadius || '0.5rem',
      customCSS: initialTheme?.customCSS || {},
    };
  }

  getTheme(): ThemeConfig {
    return { ...this.currentTheme };
  }

  setTheme(updates: Partial<ThemeConfig>): void {
    this.currentTheme = { ...this.currentTheme, ...updates };
    this.notifyListeners();
    this.persistTheme();
  }

  toggleMode(): ThemeMode {
    const modes: ThemeMode[] = ['light', 'dark', 'system'];
    const currentIndex = modes.indexOf(this.currentTheme.mode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    this.setTheme({ mode: nextMode });
    return nextMode;
  }

  getEffectiveMode(): 'light' | 'dark' {
    if (this.currentTheme.mode === 'system') {
      return this.mediaQuery?.matches ? 'dark' : 'light';
    }
    return this.currentTheme.mode as 'light' | 'dark';
  }

  subscribe(listener: (theme: ThemeConfig) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  generateCSSVariables(): Record<string, string> {
    const isDark = this.getEffectiveMode() === 'dark';
    return {
      '--bg-primary': isDark ? '#0f172a' : '#ffffff',
      '--bg-secondary': isDark ? '#1e293b' : '#f8fafc',
      '--bg-tertiary': isDark ? '#334155' : '#e2e8f0',
      '--text-primary': isDark ? '#f1f5f9' : '#0f172a',
      '--text-secondary': isDark ? '#94a3b8' : '#475569',
      '--text-muted': isDark ? '#64748b' : '#94a3b8',
      '--border-color': isDark ? '#334155' : '#e2e8f0',
      '--accent-color': this.currentTheme.primaryColor,
      '--accent-hover': this.currentTheme.accentColor,
      '--font-family': this.currentTheme.fontFamily,
      '--border-radius': this.currentTheme.borderRadius,
      '--shadow-sm': isDark ? '0 1px 2px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
      '--shadow-md': isDark ? '0 4px 6px rgba(0,0,0,0.4)' : '0 4px 6px rgba(0,0,0,0.1)',
      '--shadow-lg': isDark ? '0 10px 15px rgba(0,0,0,0.5)' : '0 10px 15px rgba(0,0,0,0.1)',
      ...this.currentTheme.customCSS,
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentTheme));
  }

  private persistTheme(): void {
    try {
      const data = JSON.stringify(this.currentTheme);
      console.log('[ThemeProvider] Theme persisted:', data.substring(0, 100));
    } catch (e) {
      console.error('[ThemeProvider] Failed to persist theme:', e);
    }
  }
}

export const themeProvider = new ThemeProvider();
