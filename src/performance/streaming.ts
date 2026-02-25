import { Response } from 'express';

export class SSEStream {
  constructor(private res: Response) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
  }
  send(event: string, data: unknown): void {
    this.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
  close(): void { this.res.end(); }
}

export class WebSocketCompression {
  static getConfig() {
    return {
      perMessageDeflate: {
        zlibDeflateOptions: { chunkSize: 1024, memLevel: 7, level: 3 },
        threshold: 1024,
      },
    };
  }
}

export class PromptCache {
  private cache = new Map<string, { response: string; ts: number }>();
  get(prompt: string): string | null {
    const h = this.hash(prompt);
    const entry = this.cache.get(h);
    if (!entry || Date.now() - entry.ts > 300000) return null;
    return entry.response;
  }
  set(prompt: string, response: string): void {
    this.cache.set(this.hash(prompt), { response, ts: Date.now() });
  }
  private hash(s: string): string {
    return Buffer.from(s).toString('base64').slice(0, 32);
  }
}

export const promptCache = new PromptCache();
