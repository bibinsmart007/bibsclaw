import { EventEmitter } from "events";
export type ChannelType = "telegram" | "discord" | "slack" | "whatsapp" | "web" | "cli" | "email";
export interface ChannelMessage { channelType: ChannelType; channelId: string; userId: string; text: string; attachments?: Array<{ type: string; url: string }>; timestamp: Date; metadata?: Record<string, unknown>; }
export interface ChannelAdapter { type: ChannelType; send(channelId: string, text: string): Promise<void>; onMessage(handler: (msg: ChannelMessage) => void): void; start(): Promise<void>; stop(): Promise<void>; }
export class ChannelGateway extends EventEmitter {
  private adapters = new Map<ChannelType, ChannelAdapter>();
  private messageHandler?: (msg: ChannelMessage) => Promise<string>;
  registerAdapter(adapter: ChannelAdapter): void {
    this.adapters.set(adapter.type, adapter);
    adapter.onMessage(async (msg) => {
      this.emit("messageReceived", msg);
      if (this.messageHandler) {
        try {
          const response = await this.messageHandler(msg);
          await adapter.send(msg.channelId, response);
          this.emit("messageSent", { ...msg, response });
        } catch (e) { this.emit("error", { msg, error: e }); }
      }
    });
    console.log(`[Gateway] Registered ${adapter.type} adapter`);
  }
  setMessageHandler(handler: (msg: ChannelMessage) => Promise<string>): void { this.messageHandler = handler; }
  async broadcast(text: string, channels?: ChannelType[]): Promise<void> {
    const targets = channels ? channels.map(c => this.adapters.get(c)).filter(Boolean) : Array.from(this.adapters.values());
    for (const adapter of targets) { if (adapter) try { await adapter.send("broadcast", text); } catch (e) { this.emit("broadcastError", { channel: adapter.type, error: e }); } }
  }
  async startAll(): Promise<void> { for (const [, adapter] of this.adapters) await adapter.start(); }
  async stopAll(): Promise<void> { for (const [, adapter] of this.adapters) await adapter.stop(); }
  getActiveChannels(): ChannelType[] { return Array.from(this.adapters.keys()); }
}
