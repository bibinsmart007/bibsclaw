// Code Syntax Highlighter - Phase 4.1
export interface HighlightConfig {
  theme: 'dark' | 'light';
  languages: string[];
  showLineNumbers: boolean;
}

export class SyntaxHighlighter {
  private config: HighlightConfig;
  constructor(config?: Partial<HighlightConfig>) {
    this.config = { theme: 'dark', languages: ['typescript', 'javascript', 'python', 'bash'], showLineNumbers: true, ...config };
  }
  highlight(code: string, lang: string): string {
    const escaped = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const lines = escaped.split('\n');
    const numbered = this.config.showLineNumbers
      ? lines.map((l, i) => `<span class="line-num">${i + 1}</span>${l}`).join('\n')
      : escaped;
    return `<pre class="hljs ${this.config.theme}"><code class="language-${lang}">${numbered}</code></pre>`;
  }
  supportsLanguage(lang: string): boolean { return this.config.languages.includes(lang); }
}
