// Theme Toggle - Phase 4.1: Dark/Light mode
export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system';
  colors: Record<string, string>;
}

export class ThemeManager {
  private mode: ThemeConfig['mode'] = 'dark';
  private listeners: Array<(m: ThemeConfig['mode']) => void> = [];

  toggle(): ThemeConfig['mode'] {
    this.mode = this.mode === 'dark' ? 'light' : 'dark';
    this.listeners.forEach(l => l(this.mode));
    return this.mode;
  }

  isDark(): boolean { return this.mode === 'dark'; }
  getMode(): ThemeConfig['mode'] { return this.mode; }
  onChange(fn: (m: ThemeConfig['mode']) => void): void { this.listeners.push(fn); }
}
