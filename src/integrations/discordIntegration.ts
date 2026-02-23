import { EventEmitter } from "events";
export interface DiscordConfig { botToken: string; guildId?: string; }
export class DiscordIntegration extends EventEmitter {
  private config: DiscordConfig;
  private apiUrl = "https://discord.com/api/v10";
  constructor(config: DiscordConfig) { super(); this.config = config; }
  private async request(endpoint: string, method: string, body?: unknown): Promise<unknown> {
    const res = await fetch(`${this.apiUrl}${endpoint}`, { method, headers: { "Authorization": `Bot ${this.config.botToken}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) throw new Error(`Discord API error: ${res.status}`);
    return res.json();
  }
  async sendMessage(channelId: string, content: string, embeds?: unknown[]): Promise<unknown> {
    return this.request(`/channels/${channelId}/messages`, "POST", { content, embeds });
  }
  async createEmbed(channelId: string, title: string, description: string, color = 0x00ff00): Promise<unknown> {
    return this.sendMessage(channelId, "", [{ title, description, color }]);
  }
  async getGuildMembers(limit = 100): Promise<unknown> {
    if (!this.config.guildId) throw new Error("Guild ID required");
    return this.request(`/guilds/${this.config.guildId}/members?limit=${limit}`, "GET");
  }
  async createChannel(name: string, type = 0): Promise<unknown> {
    if (!this.config.guildId) throw new Error("Guild ID required");
    return this.request(`/guilds/${this.config.guildId}/channels`, "POST", { name, type });
  }
  async banMember(userId: string, reason?: string): Promise<unknown> {
    if (!this.config.guildId) throw new Error("Guild ID required");
    return this.request(`/guilds/${this.config.guildId}/bans/${userId}`, "PUT", { reason });
  }
}
