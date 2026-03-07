/**
 * Discord Slash Commands for AISocialGrowth
 * ------------------------------------------
 * /seo-tip         → Random actionable SEO tip
 * /audit-site <url> → Quick Lighthouse-style site audit summary
 * /blog-latest     → Latest blog post from AISocialGrowth
 * /help            → Command reference & links
 */

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
} from 'discord.js';
import {
  BOT_COLOR,
    BOT_NAME,
  AISOCIALGROWTH_URL,
  DISCORD_BOT_TOKEN,
  DISCORD_CLIENT_ID,
  DISCORD_GUILD_ID,
} from './config.js';

/* ── SEO tips pool ────────────────────────────────────── */

const SEO_TIPS: { title: string; body: string }[] = [
  {
    title: 'Optimise your title tags',
    body: 'Keep title tags under 60 characters and front-load your primary keyword. Google truncates anything longer.',
  },
  {
    title: 'Use descriptive alt text',
    body: 'Every image should have alt text that describes the content AND includes a relevant keyword naturally.',
  },
  {
    title: 'Improve Core Web Vitals',
    body: 'LCP < 2.5 s, FID < 100 ms, CLS < 0.1. Use PageSpeed Insights to measure and fix bottlenecks.',
  },
  {
    title: 'Internal linking matters',
    body: 'Link related blog posts to each other. It helps Google discover pages and distributes page authority.',
  },
  {
    title: 'Mobile-first indexing',
    body: 'Google indexes the mobile version of your site first. Test with Chrome DevTools device mode.',
  },
  {
    title: 'Schema markup for rich snippets',
    body: 'Add JSON-LD structured data (FAQ, HowTo, Product) to earn rich results in SERPs.',
  },
  {
    title: 'Target long-tail keywords',
    body: 'Long-tail keywords have lower competition and higher conversion intent. Use tools like Google Autocomplete and "People Also Ask".',
  },
  {
    title: 'Compress images with WebP',
    body: 'Switch from PNG/JPEG to WebP. You can cut image sizes by 25-35 % with no visible quality loss.',
  },
  {
    title: 'Fix broken links regularly',
    body: '404 errors waste crawl budget and hurt UX. Run a monthly crawl and redirect or remove dead links.',
  },
  {
    title: 'Write meta descriptions that sell',
    body: 'Meta descriptions don\'t directly affect rankings, but a compelling 155-character summary boosts CTR.',
  },
  {
    title: 'Leverage Google Search Console',
    body: 'Check the Performance report weekly. Find queries where you rank #4-#10 — those are quick-win opportunities.',
  },
  {
    title: 'Page speed = ranking factor',
    body: 'Defer non-critical JS, lazy-load images, and use a CDN. Every 100 ms improvement can increase conversions by 1 %.',
  },
];

export function getRandomSeoTip() {
  return SEO_TIPS[Math.floor(Math.random() * SEO_TIPS.length)]!;
}

/* ── Command definitions ──────────────────────────────── */

export const slashCommands = [
  new SlashCommandBuilder()
    .setName('seo-tip')
    .setDescription('Get a random actionable SEO tip'),

  new SlashCommandBuilder()
    .setName('audit-site')
    .setDescription('Run a quick audit on a website URL')
    .addStringOption((opt: any) =>
      opt
        .setName('url')
        .setDescription('The website URL to audit (e.g. https://example.com)')
        .setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName('blog-latest')
    .setDescription('See the latest blog post from AISocialGrowth'),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available bot commands and useful links'),
];

/* ── Register commands with Discord API ───────────────── */

export async function registerSlashCommands(): Promise<void> {
  if (!DISCORD_BOT_TOKEN || !DISCORD_CLIENT_ID) {
    console.warn('[Discord] Missing token or client ID – skipping command registration.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);
  const body = slashCommands.map((cmd) => cmd.toJSON());

  try {
    if (DISCORD_GUILD_ID) {
      // Guild commands update instantly (great for dev)
      await rest.put(
        Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
        { body },
      );
      console.log(`[Discord] Registered ${body.length} guild commands.`);
    } else {
      // Global commands can take up to 1 hour to propagate
      await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body });
      console.log(`[Discord] Registered ${body.length} global commands.`);
    }
  } catch (err) {
    console.error('[Discord] Failed to register slash commands:', err);
  }
}

/* ── Command handlers ─────────────────────────────────── */

export async function handleSeoTip(interaction: ChatInputCommandInteraction): Promise<void> {
  const tip = getRandomSeoTip();

  const embed = new EmbedBuilder()
    .setColor(BOT_COLOR)
    .setTitle(`💡 SEO Tip: ${tip.title}`)
    .setDescription(tip.body)
    .setFooter({ text: 'AISocialGrowth • /seo-tip for another' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

export async function handleAuditSite(interaction: ChatInputCommandInteraction): Promise<void> {
  const url = interaction.options.getString('url', true).trim();

  // Basic URL validation
  if (!/^https?:\/\/.+\..+/.test(url)) {
    await interaction.reply({
      content: '❌ Please provide a valid URL starting with `http://` or `https://`.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply(); // Audit may take a moment

  try {
    // Construct a PageSpeed Insights API call (free, no key required for basic usage)
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&category=seo&category=accessibility`;
    const res = await fetch(apiUrl);

    if (!res.ok) {
      await interaction.editReply(`⚠️ Could not audit **${url}** – the PageSpeed API returned status ${res.status}.`);
      return;
    }

    const data = (await res.json()) as {
      lighthouseResult?: {
        categories?: Record<string, { score?: number | null; title?: string }>;
        audits?: Record<string, { score?: number | null; title?: string; displayValue?: string }>;
      };
    };
    const cats = data.lighthouseResult?.categories ?? {};

    const score = (cat: string) => {
      const s = cats[cat]?.score;
      return s != null ? Math.round(s * 100) : 'N/A';
    };

    const embed = new EmbedBuilder()
      .setColor(BOT_COLOR)
      .setTitle(`🔍 Site Audit: ${url}`)
      .addFields(
        { name: 'Performance', value: `${score('performance')} / 100`, inline: true },
        { name: 'SEO', value: `${score('seo')} / 100`, inline: true },
        { name: 'Accessibility', value: `${score('accessibility')} / 100`, inline: true },
      )
      .setFooter({ text: 'Powered by Google PageSpeed Insights (mobile)' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('[Discord] Audit error:', err);
    await interaction.editReply(`❌ Audit failed for **${url}**. Please check the URL and try again.`);
  }
}

export async function handleBlogLatest(interaction: ChatInputCommandInteraction): Promise<void> {
  // In a real setup this would query the AISocialGrowth blog API.
  // For now we return a static pointer to the blog section.
  const embed = new EmbedBuilder()
    .setColor(BOT_COLOR)
    .setTitle('📝 Latest from the AISocialGrowth Blog')
    .setDescription(
      'Check out the newest articles, SEO guides, and product updates on our blog.',
    )
    .addFields({
      name: 'Read now',
      value: `[${AISOCIALGROWTH_URL}/blog](${AISOCIALGROWTH_URL}/blog)`,
    })
    .setFooter({ text: 'AISocialGrowth Blog' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

export async function handleHelp(interaction: ChatInputCommandInteraction): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(BOT_COLOR)
    .setTitle('🤖 AISocialGrowth Bot — Commands')
    .setDescription('Here\'s everything I can do:')
    .addFields(
      { name: '`/seo-tip`', value: 'Get a random, actionable SEO tip.' },
      { name: '`/audit-site <url>`', value: 'Run a quick performance + SEO + accessibility audit.' },
      { name: '`/blog-latest`', value: 'See the latest blog post from AISocialGrowth.' },
      { name: '`/help`', value: 'Show this message.' },
    )
    .addFields({
      name: '🔗 Useful links',
      value: [
        `[AISocialGrowth Dashboard](${AISOCIALGROWTH_URL})`,
        `[Documentation](${AISOCIALGROWTH_URL}/docs)`,
        `[Feature Requests](${AISOCIALGROWTH_URL}/feedback)`,
      ].join(' • '),
    })
    .setFooter({ text: BOT_NAME })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
