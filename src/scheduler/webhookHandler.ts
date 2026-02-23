import { EventEmitter } from "events";
import * as http from "http";
export interface WebhookConfig { id: string; path: string; secret?: string; handler: (payload: unknown) => void | Promise<void>; }
export class WebhookHandler extends EventEmitter {
  private hooks = new Map<string, WebhookConfig>();
  private server: http.Server | null = null;
  registerHook(config: WebhookConfig): void { this.hooks.set(config.id, config); this.emit("hookRegistered", { id: config.id }); }
  removeHook(id: string): boolean { return this.hooks.delete(id); }
  start(port: number = 9090): void {
    this.server = http.createServer(async (req, res) => {
      const url = req.url || "/";
      for (const [, hook] of this.hooks) {
        if (url === hook.path) {
          let body = "";
          req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
          req.on("end", async () => {
            try {
              const payload = JSON.parse(body || "{}");
              if (hook.secret && req.headers["x-webhook-secret"] !== hook.secret) { res.writeHead(401); res.end("Unauthorized"); return; }
              await hook.handler(payload);
              res.writeHead(200); res.end("OK");
              this.emit("webhookReceived", { id: hook.id, payload });
            } catch (e) { res.writeHead(500); res.end("Error"); this.emit("webhookError", { id: hook.id, error: e }); }
          });
          return;
        }
      }
      res.writeHead(404); res.end("Not Found");
    });
    this.server.listen(port, () => console.log(`[Webhook] Listening on port ${port}`));
  }
  stop(): void { if (this.server) this.server.close(); }
  listHooks() { return Array.from(this.hooks.keys()); }
}
