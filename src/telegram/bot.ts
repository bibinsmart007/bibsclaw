import { Bot } from "grammy";
import { appConfig } from "../config.js";
import { BibsClawAgent } from "../agent/agent.js";

export class TelegramBot {
  private bot: Bot | null = null;
  private agent: BibsClawAgent;

  constructor(agent: BibsClawAgent) {
    this.agent = agent;
  }

  get enabled(): boolean {
    return appConfig.telegram.enabled;
  }

  async start(): Promise<void> {
    if (!appConfig.telegram.enabled) {
      console.log("Telegram bot disabled (no TELEGRAM_BOT_TOKEN set)");
      return;
    }

    this.bot = new Bot(appConfig.telegram.botToken);

    // /start command
    this.bot.command("start", async (ctx) => {
      if (!this.isAllowedUser(ctx.from?.username)) {
        await ctx.reply("Sorry, you are not authorized to use BibsClaw.");
        return;
      }
      await ctx.reply(
        "Hey! I'm BibsClaw, Bibin's personal AI assistant.\n\n" +
        "Just send me any message and I'll respond!\n\n" +
        "Commands:\n" +
        "/start - Show this help\n" +
        "/clear - Clear conversation history\n" +
        "/status - Check system status"
      );
    });

    // /clear command
    this.bot.command("clear", async (ctx) => {
      if (!this.isAllowedUser(ctx.from?.username)) return;
      this.agent.clearHistory();
      await ctx.reply("Conversation history cleared!");
    });

    // /status command
    this.bot.command("status", async (ctx) => {
      if (!this.isAllowedUser(ctx.from?.username)) return;
      const status = [
        `AI Provider: ${appConfig.ai.provider}`,
        `Agent Busy: ${this.agent.busy ? "Yes" : "No"}`,
        `Dashboard: ${appConfig.web.dashboardEnabled ? "Enabled" : "Disabled"}`,
      ].join("\n");
      await ctx.reply(`BibsClaw Status:\n${status}`);
    });

    // Handle all text messages
    this.bot.on("message:text", async (ctx) => {
      if (!this.isAllowedUser(ctx.from?.username)) {
        await ctx.reply("Sorry, you are not authorized.");
        return;
      }

      const userMessage = ctx.message.text;
      try {
        // Show typing indicator
        await ctx.replyWithChatAction("typing");
        const response = await this.agent.chat(userMessage);

        // Split long messages (Telegram has 4096 char limit)
        if (response.length > 4000) {
          const chunks = this.splitMessage(response, 4000);
          for (const chunk of chunks) {
            await ctx.reply(chunk);
          }
        } else {
          await ctx.reply(response || "I processed your message but have no response.");
        }
      } catch (err) {
        console.error("Telegram message error:", err);
        await ctx.reply("Sorry, I encountered an error processing your message. Please try again.");
      }
    });

    // Handle voice messages
    this.bot.on("message:voice", async (ctx) => {
      if (!this.isAllowedUser(ctx.from?.username)) return;
      await ctx.reply("Voice messages will be supported soon! For now, please type your message.");
    });

    // Error handler
    this.bot.catch((err) => {
      console.error("Telegram bot error:", err);
    });

    // Delete any existing webhook/polling session to prevent 409 conflicts
    try {
      await this.bot.api.deleteWebhook({ drop_pending_updates: true });
    } catch (e: any) {
      console.warn("Could not delete webhook:", e.message);
    }

    // Start polling in background with conflict resolution
    this.bot.start({
      drop_pending_updates: true,
      onStart: () => console.log("Telegram bot started successfully!"),
    });
  }

  private isAllowedUser(username?: string): boolean {
    // If no allowed users configured, allow everyone
    if (appConfig.telegram.allowedUsers.length === 0) {
      return true;
    }
    if (!username) return false;
    return appConfig.telegram.allowedUsers.includes(username);
  }

  private splitMessage(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining);
        break;
      }
      // Try to split at a newline
      let splitIndex = remaining.lastIndexOf("\n", maxLength);
      if (splitIndex === -1 || splitIndex < maxLength / 2) {
        splitIndex = remaining.lastIndexOf(" ", maxLength);
      }
      if (splitIndex === -1) {
        splitIndex = maxLength;
      }
      chunks.push(remaining.slice(0, splitIndex));
      remaining = remaining.slice(splitIndex).trimStart();
    }
    return chunks;
  }

  async stop(): Promise<void> {
    if (this.bot) {
      await this.bot.stop();
    }
  }
}
