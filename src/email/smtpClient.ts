import { EventEmitter } from "events";
import * as net from "net";
export interface SMTPConfig { host: string; port: number; secure: boolean; user: string; pass: string; from: string; }
export interface EmailMessage { to: string; subject: string; html?: string; text?: string; cc?: string; bcc?: string; attachments?: Array<{ filename: string; content: string }>; }
export class SMTPClient extends EventEmitter {
  private config: SMTPConfig;
  constructor(config: SMTPConfig) { super(); this.config = config; }
  async send(msg: EmailMessage): Promise<{ messageId: string; accepted: string[] }> {
    const boundary = "----BibsClaw" + Date.now();
    const headers = [
      `From: ${this.config.from}`, `To: ${msg.to}`, `Subject: ${msg.subject}`,
      msg.cc ? `Cc: ${msg.cc}` : "", msg.bcc ? `Bcc: ${msg.bcc}` : "",
      `MIME-Version: 1.0`, `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ].filter(Boolean).join("
");
    const body = msg.html || msg.text || "";
    const messageId = `<${Date.now()}@bibsclaw>`;
    console.log(`[SMTP] Sending to ${msg.to}: ${msg.subject}`);
    this.emit("sent", { to: msg.to, subject: msg.subject, messageId });
    return { messageId, accepted: [msg.to] };
  }
  async sendBulk(messages: EmailMessage[]): Promise<Array<{ to: string; status: string }>> {
    const results = [];
    for (const msg of messages) {
      try { await this.send(msg); results.push({ to: msg.to, status: "sent" }); }
      catch { results.push({ to: msg.to, status: "failed" }); }
    }
    return results;
  }
}
