export interface RenderOptions {
  enableCodeHighlighting: boolean;
  enableMath: boolean;
  enableMermaid: boolean;
  sanitizeHTML: boolean;
  maxImageWidth: number;
}

const DEFAULT_OPTIONS: RenderOptions = {
  enableCodeHighlighting: true,
  enableMath: false,
  enableMermaid: false,
  sanitizeHTML: true,
  maxImageWidth: 800,
};

interface CodeBlock {
  language: string;
  code: string;
  highlighted: string;
}

const LANGUAGE_MAP: Record<string, string> = {
  js: "javascript", ts: "typescript", py: "python",
  rb: "ruby", sh: "bash", yml: "yaml",
  md: "markdown", json: "json", html: "html",
  css: "css", sql: "sql", go: "go", rs: "rust",
};

export class MarkdownRenderer {
  private options: RenderOptions;

  constructor(options?: Partial<RenderOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  render(markdown: string): string {
    let html = this.escapeHtml(markdown);
    html = this.renderCodeBlocks(html);
    html = this.renderInlineCode(html);
    html = this.renderHeaders(html);
    html = this.renderBold(html);
    html = this.renderItalic(html);
    html = this.renderLinks(html);
    html = this.renderLists(html);
    html = this.renderBlockquotes(html);
    html = this.renderHorizontalRules(html);
    html = this.renderParagraphs(html);
    return html;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  private renderCodeBlocks(text: string): string {
    return text.replace(/```(\w*)
([\s\S]*?)```/g, (_match, lang, code) => {
      const language = LANGUAGE_MAP[lang] || lang || "plaintext";
      const highlighted = this.highlightSyntax(code.trim(), language);
      return `<div class="code-block"><div class="code-header"><span class="code-lang">${language}</span><button class="copy-btn" onclick="navigator.clipboard.writeText(this.closest('.code-block').querySelector('code').textContent)">Copy</button></div><pre><code class="language-${language}">${highlighted}</code></pre></div>`;
    });
  }

  private renderInlineCode(text: string): string {
    return text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  }

  private renderHeaders(text: string): string {
    return text
      .replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>');
  }

  private renderBold(text: string): string {
    return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }

  private renderItalic(text: string): string {
    return text.replace(/\*(.+?)\*/g, "<em>$1</em>");
  }

  private renderLinks(text: string): string {
    return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  private renderLists(text: string): string {
    return text.replace(/^[\-\*] (.+)$/gm, '<li class="md-li">$1</li>');
  }

  private renderBlockquotes(text: string): string {
    return text.replace(/^&gt; (.+)$/gm, '<blockquote class="md-quote">$1</blockquote>');
  }

  private renderHorizontalRules(text: string): string {
    return text.replace(/^---$/gm, '<hr class="md-hr">');
  }

  private renderParagraphs(text: string): string {
    return text.replace(/^(?!<[hluobpd]|<li|<hr|<block)(.+)$/gm, "<p>$1</p>");
  }

  private highlightSyntax(code: string, language: string): string {
    if (!this.options.enableCodeHighlighting) return code;
    const keywords: Record<string, string[]> = {
      javascript: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "class", "import", "export", "from", "async", "await", "new", "this", "try", "catch", "throw"],
      typescript: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "class", "import", "export", "from", "async", "await", "new", "this", "interface", "type", "enum", "implements", "extends", "generic"],
      python: ["def", "class", "import", "from", "return", "if", "elif", "else", "for", "while", "try", "except", "with", "as", "yield", "lambda", "pass", "raise"],
    };
    const kw = keywords[language] || keywords.javascript || [];
    let result = code;
    kw.forEach(k => {
      result = result.replace(new RegExp(`\b(${k})\b`, "g"), `<span class="kw">${k}</span>`);
    });
    result = result.replace(/("[^"]*"|'[^']*'|\`[^\`]*\`)/g, '<span class="str">$1</span>');
    result = result.replace(/(\/\/[^
]*)/g, '<span class="cmt">$1</span>');
    result = result.replace(/(\d+\.?\d*)/g, '<span class="num">$1</span>');
    return result;
  }

  extractCodeBlocks(markdown: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    const regex = /```(\w*)([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(markdown)) !== null) {
      const language = LANGUAGE_MAP[match[1]] || match[1] || "plaintext";
      blocks.push({ language, code: match[2].trim(), highlighted: this.highlightSyntax(match[2].trim(), language) });
    }
    return blocks;
  }
}

export const markdownRenderer = new MarkdownRenderer();
