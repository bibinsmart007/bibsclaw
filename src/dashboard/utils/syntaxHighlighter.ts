// Syntax Highlighter - Phase 4.1
// Code syntax highlighting for AI responses

export interface HighlightTheme {
  keyword: string; string: string; number: string; comment: string;
  function: string; variable: string; operator: string; background: string;
}

export interface HighlightResult {
  html: string; language: string; lineCount: number;
}

const DARK_THEME: HighlightTheme = {
  keyword: "#c678dd", string: "#98c379", number: "#d19a66", comment: "#5c6370",
  function: "#61afef", variable: "#e06c75", operator: "#56b6c2", background: "#282c34",
};

const PATTERNS: Record<string, RegExp> = {
  keyword: /\b(const|let|var|function|class|if|else|for|while|return|import|export|from|async|await|new|this|typeof|interface|type)\b/g,
  string: /("[^"]*"|'[^']*'|`[^`]*`)/g,
  number: /\b\d+(\.\d+)?\b/g,
  comment: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
};

export class SyntaxHighlighter {
  private theme: HighlightTheme;
  private supportedLanguages: Set<string>;

  constructor(theme?: Partial<HighlightTheme>) {
    this.theme = { ...DARK_THEME, ...theme };
    this.supportedLanguages = new Set(["javascript", "typescript", "python", "json", "html", "css", "bash", "sql"]);
  }

  highlight(code: string, language: string = "typescript"): HighlightResult {
    const escaped = this.escapeHtml(code);
    let highlighted = escaped;
    if (this.supportedLanguages.has(language)) {
      highlighted = this.applyPatterns(escaped);
    }
    return { html: `<pre style="background:${this.theme.background}"><code>${highlighted}</code></pre>`, language, lineCount: code.split("\n").length };
  }

  isSupported(language: string): boolean { return this.supportedLanguages.has(language); }
  getSupportedLanguages(): string[] { return Array.from(this.supportedLanguages); }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  private applyPatterns(code: string): string {
    let result = code;
    for (const [type, pattern] of Object.entries(PATTERNS)) {
      const color = this.theme[type as keyof HighlightTheme] || "inherit";
      result = result.replace(pattern, `<span style="color:${color}">$&</span>`);
    }
    return result;
  }
}
