// src/integrations/blog-agent/index.ts
// Blog Agent entry point — exports startBlogAgent() and utilities

import { startScheduler } from './scheduler.js';
export { loadBlogAgentConfig, BLOG_NICHES, INTERNAL_LINKS } from './config.js';
export type { BlogAgentConfig } from './config.js';

export { researchTopic } from './topicResearcher.js';
export type { BlogTopic } from './topicResearcher.js';

export { writeBlogPost } from './blogWriter.js';
export type { BlogPost } from './blogWriter.js';

export { publishBlogPost, getRecentPosts } from './blogPublisher.js';
export type { PublishedPost } from './blogPublisher.js';

export {
  startScheduler,
  stopScheduler,
  triggerManualRun,
  getSchedulerStatus,
} from './scheduler.js';
export type { SchedulerStatus } from './scheduler.js';

/**
 * Starts the Blog Agent — daily automated SEO blog post generation.
 *
 * Pipeline: Research Topic → Write Post (Claude Haiku) → Publish to Supabase
 * Default schedule: 6:00 AM UTC daily
 * Estimated cost: ~$0.05 per post
 *
 * Required env vars:
 *   ANTHROPIC_API_KEY         — Claude API key
 *   SUPABASE_URL              — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase service role key
 *   BLOG_CRON_SCHEDULE        — Cron expression (default: '0 6 * * *')
 *
 * Usage:
 *   import { startBlogAgent } from './integrations/blog-agent/index.js';
 *   startBlogAgent();
 */
export function startBlogAgent(): void {
  console.log('========================================');
  console.log(' AISocialGrowth Blog Agent');
  console.log(' Powered by BibsClaw');
  console.log('========================================');

  try {
    startScheduler();
    console.log('[BlogAgent] Agent started successfully.');
    console.log('[BlogAgent] Use triggerManualRun() to test immediately.');
  } catch (err) {
    console.error('[BlogAgent] Failed to start:', err instanceof Error ? err.message : err);
    throw err;
  }
}
