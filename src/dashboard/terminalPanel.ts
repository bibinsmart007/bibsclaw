// Terminal Output Panel - Phase 4.1
export interface TerminalLine {
  text: string;
  type: 'stdout' | 'stderr' | 'system';
  timestamp: Date;
}

export class TerminalPanel {
  private lines: TerminalLine[] = [];
  private maxLines: number = 1000;
  private listeners: Array<(lines: TerminalLine[]) => void> = [];

  append(text: string, type: TerminalLine['type'] = 'stdout'): void {
    this.lines.push({ text, type, timestamp: new Date() });
    if (this.lines.length > this.maxLines) this.lines = this.lines.slice(-this.maxLines);
    this.listeners.forEach(l => l(this.getLines()));
  }

  clear(): void { this.lines = []; this.listeners.forEach(l => l([])); }
  getLines(): TerminalLine[] { return [...this.lines]; }
  onUpdate(fn: (lines: TerminalLine[]) => void): void { this.listeners.push(fn); }
}
