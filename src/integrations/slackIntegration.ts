import { EventEmitter } from "events";
export interface SlackConfig { botToken: string; signingSecret: string; defaultChannel?: string; }
export class SlackIntegration extends EventEmitter {
  private config: SlackConfig;
  private apiUrl = "https://slack.com/api";
  constructor(config: SlackConfig) { super(); this.config = config; }
  private async request(method: string, body: Record<string, unknown>): Promise<unknown> {
    const res = await fetch(`${this.apiUrl}/${method}`, { method: "POST", headers: { "Authorization": `Bearer ${this.config.botToken}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json() as { ok: boolean; error?: string };
    if (!data.ok) throw new Error(`Slack error: ${data.error}`);
    return data;
  }
  async sendMessage(channel: string, text: string, blocks?: unknown[]): Promise<unknown> {
    return this.request("chat.postMessage", { channel, text, blocks });
  }
  async sendDM(userId: string, text: string): Promise<unknown> {
    const conv = await this.request("conversations.open", { users: userId }) as { channel: { id: string } };
    return this.sendMessage(conv.channel.id, text);
  }
  async listChannels(): Promise<unknown> { return this.request("conversations.list", { types: "public_channel,private_channel" }); }
  async getHistory(channel: string, limit = 50): Promise<unknown> { return this.request("conversations.history", { channel, limit }); }
  async reactToMessage(channel: string, timestamp: string, emoji: string): Promise<unknown> {
    return this.request("reactions.add", { channel, timestamp, name: emoji });
  }
  async uploadFile(channel: string, content: string, filename: string): Promise<unknown> {
    return this.request("files.upload", { channels: channel, content, filename });
  }
}
