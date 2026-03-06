/**
 * Discord Scheduler for AISocialGrowth
 * --------------------------------------
 * Posts a daily SEO tip to the configured channel at 9 AM UTC
 * using node-cron.
 */

import cron from 'node-cron';
import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { BOT_COLOR, BOT_NAME, CHANNELS, SEO_TIP_CRON } from './config.js';
import { getRandomSeoTip } from './commands.js';

let scheduledTask: cron.ScheduledTask | null = null;

/**
 * Start the daily SEO tip scheduler.
 * Call this once after the Discord client is ready.
 */
export function startScheduler(client: Client): void {
  if (scheduledTask) {
    console.warn('[Discord] Scheduler already running – skipping duplicate start.');
    return;
  }

  if (!cron.validate(SEO_TIP_CRON)) {
    console.error(`[Discord] Invalid cron expression: "${SEO_TIP_CRON}" – scheduler not started.`);
    return;
  }

  scheduledTask = cron.schedule(SEO_TIP_CRON, async () => {
    await postDailySeoTip(client);
  }, {
    timezone: 'UTC',
  });

  console.log(`[Discord] Daily SEO tip scheduler started (cron: "${SEO_TIP_CRON}").`);
}

/**
 * Stop the scheduler gracefully (e.g. on bot shutdown).
 */
export function stopScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[Discord] Scheduler stopped.');
  }
}

/* ── Post the daily tip ───────────────────────────────── */

async function postDailySeoTip(client: Client): Promise<void> {
  const channelId = CHANNELS.seoTips?.id;
  if (!channelId) {
    console.warn('[Discord] No SEO tips channel configured – skipping daily tip.');
    return;
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !(channel instanceof TextChannel)) {
      console.warn(`[Discord] SEO tips channel ${channelId} is not a text channel.`);
      return;
    }

    const tip = getRandomSeoTip();
    const dayNumber = Math.floor((Date.now() - new Date('2026-01-01').getTime()) / 86_400_000) + 1;

    const embed = new EmbedBuilder()
      .setColor(BOT_COLOR)
      .setTitle(`☀️ Daily SEO Tip #${dayNumber}: ${tip.title}`)
      .setDescription(tip.body)
      .addFields({
        name: '🔗 Want a full site audit?',
        value: 'Use `/audit-site <url>` right here in Discord!',
      })
      .setFooter({ text: `${BOT_NAME} • Daily at 9 AM UTC` })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    console.log(`[Discord] Posted daily SEO tip #${dayNumber}: "${tip.title}"`);
  } catch (err) {
    console.error('[Discord] Failed to post daily SEO tip:', err);
  }
}
