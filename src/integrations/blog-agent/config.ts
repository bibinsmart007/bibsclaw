// src/integrations/blog-agent/config.ts
// Blog Agent Configuration - Environment variables and defaults

import dotenv from 'dotenv';
dotenv.config();

export interface BlogAgentConfig {
  anthropicApiKey: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  cronSchedule: string;
  claudeModel: string;
  maxTokens: number;
  targetWordCount: { min: number; max: number };
  siteUrl: string;
  siteName: string;
  author: string;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`[BlogAgent] Missing required env var: ${key}`);
  }
  return value;
}

export function loadBlogAgentConfig(): BlogAgentConfig {
  return {
    anthropicApiKey: requireEnv('ANTHROPIC_API_KEY'),
    supabaseUrl: requireEnv('SUPABASE_URL'),
    supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    cronSchedule: process.env.BLOG_CRON_SCHEDULE || '0 6 * * *',
    claudeModel: 'claude-3-haiku-20240307',
    maxTokens: 4096,
    targetWordCount: { min: 1500, max: 2000 },
    siteUrl: 'https://www.aisocialgrowth.com',
    siteName: 'AISocialGrowth',
    author: 'AISocialGrowth Team',
  };
}

export const BLOG_NICHES = [
  'social media marketing',
  'AI tools for business',
  'e-commerce growth',
  'Instagram marketing',
  'TikTok marketing',
  'content creation',
  'SEO strategy',
  'email marketing automation',
  'influencer marketing',
  'Shopify store optimization',
  'Facebook ads',
  'social media analytics',
  'brand building',
  'video marketing',
  'dropshipping',
] as const;

export const INTERNAL_LINKS: Record<string, string> = {
  'AI Content Studio': '/ai-content-studio',
  'Post Scheduler': '/post-scheduler',
  'Social Publisher': '/social-publisher',
  'Video Studio': '/video-studio',
  'SEO Dashboard': '/seo-dashboard',
  'Store Integration': '/store-integration',
  'Analytics': '/analytics',
  'Ad Copy Studio': '/ad-copy-studio',
  'Website Analyzer': '/website-analyzer',
  'Competitor Intel': '/competitor-intel',
  'Template Library': '/template-library',
  'Media Planner': '/media-planner',
};
