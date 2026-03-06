/**
 * Discord Bot Configuration for AISocialGrowth Community
 * -------------------------------------------------------
 * Environment variables and channel mapping used across the
 * Discord integration layer.
 */

import dotenv from 'dotenv';
dotenv.config();

/* ── Environment variables ────────────────────────────── */

export const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN ?? '';
export const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID ?? '';
export const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID ?? '';

if (!DISCORD_BOT_TOKEN) {
  console.warn('[Discord] DISCORD_BOT_TOKEN is not set – bot will not start.');
}

/* ── Channel configuration ────────────────────────────── */

export interface ChannelConfig {
  /** Human-readable label */
  name: string;
  /** Discord channel ID – set via env or override at runtime */
  id: string;
}

/**
 * Map of logical channel names → Discord channel IDs.
 * Populate via environment variables (recommended) or
 * hard-code IDs for a single-server setup.
 */
export const CHANNELS: Record<string, ChannelConfig> = {
  announcements: {
    name: '#announcements',
    id: process.env.DISCORD_CHANNEL_ANNOUNCEMENTS ?? '',
  },
  seoTips: {
    name: '#seo-tips',
    id: process.env.DISCORD_CHANNEL_SEO_TIPS ?? '',
  },
  featureRequests: {
    name: '#feature-requests',
    id: process.env.DISCORD_CHANNEL_FEATURE_REQUESTS ?? '',
  },
  showcaseResults: {
    name: '#showcase-results',
    id: process.env.DISCORD_CHANNEL_SHOWCASE_RESULTS ?? '',
  },
  support: {
    name: '#support',
    id: process.env.DISCORD_CHANNEL_SUPPORT ?? '',
  },
  welcome: {
    name: '#welcome',
    id: process.env.DISCORD_CHANNEL_WELCOME ?? '',
  },
  blogUpdates: {
    name: '#blog-updates',
    id: process.env.DISCORD_CHANNEL_BLOG_UPDATES ?? '',
  },
};

/* ── Role configuration ───────────────────────────────── */

/** Role ID auto-assigned to new members on join */
export const AUTO_ROLE_ID = process.env.DISCORD_AUTO_ROLE_ID ?? '';

/* ── Scheduler configuration ──────────────────────────── */

/** Cron expression for the daily SEO tip (default: 9 AM UTC) */
export const SEO_TIP_CRON = process.env.DISCORD_SEO_TIP_CRON ?? '0 9 * * *';

/* ── Bot metadata ─────────────────────────────────────── */

export const BOT_NAME = 'AISocialGrowth Bot';
export const BOT_COLOR = 0x6366f1; // Indigo-500 — brand accent
export const AISOCIALGROWTH_URL = 'https://www.aisocialgrowth.com';
