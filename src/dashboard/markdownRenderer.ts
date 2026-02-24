// Markdown Renderer - Phase 4.1
export interface RenderOptions {
  sanitize: boolean;
  syntaxHighlight: boolean;
  linkTarget: '_blank' | '_self';
}

export class MarkdownRenderer {
  private opts: RenderOptions;
  constructor(opts?: Partial<RenderOptions>) {
    this.opts = { sanitize: true, syntaxHighlight: true, linkTarget: '_blank', ...opts };
  }
  render(md: string): string {
    let html = md
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
    return this.opts.sanitize ? this.sanitizeHtml(html) : html;
  }
  private sanitizeHtml(html: string): string {
    return html.replace(/<script[^>]*>.*?<\/script>/gi, '');
  }
}
