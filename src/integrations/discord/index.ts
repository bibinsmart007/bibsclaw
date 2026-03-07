/**
 * Discord Bot Entry Point for AISocialGrowth
 * --------------------------------------------
 * Initialises the Discord.js v14 client with the required intents,
 * registers slash commands, hooks up event listeners, and starts
 * the daily SEO tip scheduler.
 *
 * Usage:
 *   import { startDiscordBot, stopDiscordBot } from './integrations/discord/index.js';
 *   await startDiscordBot();
 */

import {
  Client,
  Events,
  GatewayIntentBits,
  Interaction,
} from 'discord.js';
import { DISCORD_BOT_TOKEN, BOT_NAME } from './config.js';
import {
  handleAuditSite,
  handleBlogLatest,
  handleHelp,
  handleSeoTip,
  registerSlashCommands,
} from './commands.js';
import { registerEvents } from './events.js';
import { startScheduler, stopScheduler } from './scheduler.js';

/* ── Client singleton ─────────────────────────────────── */

let client: Client | null = null;

/**
 * Create and start the Discord bot.
 * Resolves once the bot is online and all commands are registered.
 */
export async function startDiscordBot(): Promise<Client | null> {
  if (!DISCORD_BOT_TOKEN) {
    console.warn('[Discord] No DISCORD_BOT_TOKEN set – Discord integration disabled.');
    return null;
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.MessageContent,
    ],
  });

  /* ── Ready handler ────────────────────────────────── */

  client.once(Events.ClientReady, async (readyClient: any) => {
    console.log(`[Discord] ${BOT_NAME} online as ${readyClient.user.tag}`);
    console.log(`[Discord] Serving ${readyClient.guilds.cache.size} guild(s)`);

    // Register slash commands after the bot is ready
    await registerSlashCommands();

    // Wire up event listeners (welcome, auto-role, etc.)
    registerEvents(readyClient: any);

    // Start the daily SEO tip scheduler
    startScheduler(readyClient: any);
  });

  /* ── Interaction handler (slash commands) ──────────── */

  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    try {
      switch (interaction.commandName) {
        case 'seo-tip':
          await handleSeoTip(interaction);
          break;
        case 'audit-site':
          await handleAuditSite(interaction);
          break;
        case 'blog-latest':
          await handleBlogLatest(interaction);
          break;
        case 'help':
          await handleHelp(interaction);
          break;
        default:
          await interaction.reply({
            content: `Unknown command: \`/${interaction.commandName}\``,
            ephemeral: true,
          });
      }
    } catch (err: any) {
      console.error(`[Discord] Error handling /${interaction.commandName}:`, err);
      const reply = interaction.deferred || interaction.replied
        ? interaction.editReply.bind(interaction)
        : interaction.reply.bind(interaction);
      await reply({ content: '❌ Something went wrong. Please try again.' }).catch(() => {});
    }
  });

  /* ── Error handlers ───────────────────────────────── */

  client.on(Events.Error, (err: any) => {
    console.error('[Discord] Client error:', err);
  });

  client.on(Events.Warn, (msg: any) => {
    console.warn('[Discord] Client warning:', msg);
  });

  /* ── Login ────────────────────────────────────────── */

  await client.login(DISCORD_BOT_TOKEN);
  return client;
}

/**
 * Gracefully shut down the Discord bot.
 */
export async function stopDiscordBot(): Promise<void> {
  stopScheduler();
  if (client) {
    client.destroy();
    client = null;
    console.log('[Discord] Bot disconnected.');
  }
}
