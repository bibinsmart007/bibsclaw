/**
 * Discord Event Handlers for AISocialGrowth
 * -------------------------------------------
 * • Welcome new members with an onboarding embed
 * • Auto-assign a community role on join
 */

import {
  Client,
  EmbedBuilder,
  GuildMember,
  TextChannel,
} from 'discord.js';
import {
  AISOCIALGROWTH_URL,
  AUTO_ROLE_ID,
  BOT_COLOR,
  BOT_NAME,
  CHANNELS,
} from './config.js';

/**
 * Register all non-command event listeners on the Discord client.
 */
export function registerEvents(client: Client): void {
  client.on('guildMemberAdd', async (member: GuildMember) => {
    await sendWelcomeMessage(member);
    await assignAutoRole(member);
  });

  console.log('[Discord] Event listeners registered (guildMemberAdd).');
}

/* ── Welcome message ──────────────────────────────────── */

async function sendWelcomeMessage(member: GuildMember): Promise<void> {
  const channelId = CHANNELS.welcome?.id;
  if (!channelId) {
    console.warn('[Discord] No welcome channel configured – skipping welcome message.');
    return;
  }

  try {
    const channel = await member.client.channels.fetch(channelId);
    if (!channel || !(channel instanceof TextChannel)) {
      console.warn(`[Discord] Welcome channel ${channelId} is not a text channel.`);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(BOT_COLOR)
      .setTitle(`Welcome to AISocialGrowth, ${member.displayName}! 🎉`)
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .setDescription(
        [
          `Hey <@${member.id}>, thanks for joining the **AISocialGrowth** community!`,
          '',
        "Here's how to get started:",
        ].join('\n'),
      )
      .addFields(
        {
          name: '📢 Announcements',
          value: `Stay up-to-date in <#${CHANNELS.announcements?.id || 'announcements'}>`,
          inline: true,
        },
        {
          name: '💡 SEO Tips',
          value: `Daily tips in <#${CHANNELS.seoTips?.id || 'seo-tips'}>`,
          inline: true,
        },
        {
          name: '🆘 Support',
          value: `Need help? Ask in <#${CHANNELS.support?.id || 'support'}>`,
          inline: true,
        },
        {
          name: '🚀 Quick actions',
          value: [
            '• Use `/seo-tip` to get an instant SEO tip',
            '• Use `/audit-site <url>` to audit any website',
            '• Use `/blog-latest` to read our newest article',
            `• [Open the Dashboard](${AISOCIALGROWTH_URL})`,
          ].join('\n'),
        },
      )
      .setFooter({ text: `${BOT_NAME} • Member #${member.guild.memberCount}` })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    console.log(`[Discord] Welcomed new member: ${member.user.tag}`);
  } catch (err) {
    console.error('[Discord] Failed to send welcome message:', err);
  }
}

/* ── Auto-role assignment ─────────────────────────────── */

async function assignAutoRole(member: GuildMember): Promise<void> {
  if (!AUTO_ROLE_ID) {
    // No auto-role configured – nothing to do
    return;
  }

  try {
    const role = member.guild.roles.cache.get(AUTO_ROLE_ID);
    if (!role) {
      console.warn(`[Discord] Auto-role ${AUTO_ROLE_ID} not found in guild.`);
      return;
    }

    await member.roles.add(role, 'AISocialGrowth auto-role on join');
    console.log(`[Discord] Assigned role "${role.name}" to ${member.user.tag}`);
  } catch (err) {
    console.error('[Discord] Failed to assign auto-role:', err);
  }
}
