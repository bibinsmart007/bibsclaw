// src/integrations/blog-agent/scheduler.ts
// node-cron job: daily at 6AM UTC — research topic -> write post -> publish to Supabase

import cron from 'node-cron';
import { loadBlogAgentConfig, type BlogAgentConfig } from './config.js';
import { researchTopic } from './topicResearcher.js';
import { writeBlogPost } from './blogWriter.js';
import { publishBlogPost, getRecentPosts } from './blogPublisher.js';

export interface SchedulerStatus {
  isRunning: boolean;
  lastRunAt: string | null;
  lastResult: 'success' | 'error' | null;
  lastError: string | null;
  postsPublished: number;
  nextRunAt: string | null;
}

const status: SchedulerStatus = {
  isRunning: false,
  lastRunAt: null,
  lastResult: null,
  lastError: null,
  postsPublished: 0,
  nextRunAt: null,
};

let cronTask: cron.ScheduledTask | null = null;

/**
 * Executes the full blog pipeline: research -> write -> publish
 */
async function runBlogPipeline(config: BlogAgentConfig): Promise<void> {
  const startTime = Date.now();
  status.isRunning = true;
  status.lastRunAt = new Date().toISOString();

  console.log('========================================');
  console.log('[BlogAgent:Scheduler] Starting daily blog pipeline...');
  console.log(`[BlogAgent:Scheduler] Time: ${status.lastRunAt}`);
  console.log('========================================');

  try {
    // Step 1: Research topic
    console.log('[BlogAgent:Scheduler] Step 1/3 — Researching topic...');
    const topic = await researchTopic(config);
    console.log(`[BlogAgent:Scheduler] Topic selected: "${topic.title}"`);
    console.log(`[BlogAgent:Scheduler] Niche: ${topic.niche}`);
    console.log(`[BlogAgent:Scheduler] Keyword: ${topic.targetKeyword}`);

    // Step 2: Write blog post
    console.log('[BlogAgent:Scheduler] Step 2/3 — Writing blog post...');
    const post = await writeBlogPost(config, topic);
    console.log(`[BlogAgent:Scheduler] Post written: ${post.wordCount} words`);

    // Step 3: Publish to Supabase
    console.log('[BlogAgent:Scheduler] Step 3/3 — Publishing to Supabase...');
    const published = await publishBlogPost(config, post);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    status.lastResult = 'success';
    status.lastError = null;
    status.postsPublished++;

    console.log('========================================');
    console.log('[BlogAgent:Scheduler] Pipeline complete!');
    console.log(`[BlogAgent:Scheduler] Post: "${published.title}"`);
    console.log(`[BlogAgent:Scheduler] Slug: ${published.slug}`);
    console.log(`[BlogAgent:Scheduler] ID: ${published.id}`);
    console.log(`[BlogAgent:Scheduler] Total posts published: ${status.postsPublished}`);
    console.log(`[BlogAgent:Scheduler] Duration: ${elapsed}s`);
    console.log('========================================');
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    status.lastResult = 'error';
    status.lastError = errorMsg;

    console.error('========================================');
    console.error('[BlogAgent:Scheduler] Pipeline FAILED');
    console.error(`[BlogAgent:Scheduler] Error: ${errorMsg}`);
    console.error('========================================');
  } finally {
    status.isRunning = false;
  }
}

/**
 * Starts the cron scheduler for daily blog generation
 */
export function startScheduler(): void {
  const config = loadBlogAgentConfig();
  const schedule = config.cronSchedule;

  if (!cron.validate(schedule)) {
    throw new Error(`[BlogAgent:Scheduler] Invalid cron expression: ${schedule}`);
  }

  if (cronTask) {
    console.warn('[BlogAgent:Scheduler] Scheduler already running. Stopping previous instance.');
    cronTask.stop();
  }

  console.log(`[BlogAgent:Scheduler] Starting with schedule: "${schedule}"`);
  console.log(`[BlogAgent:Scheduler] Model: ${config.claudeModel}`);
  console.log(`[BlogAgent:Scheduler] Target: ${config.siteUrl}`);
  console.log(`[BlogAgent:Scheduler] Author: ${config.author}`);

  cronTask = cron.schedule(schedule, () => {
    runBlogPipeline(config).catch((err) => {
      console.error('[BlogAgent:Scheduler] Unhandled pipeline error:', err);
    });
  });

  console.log('[BlogAgent:Scheduler] Cron job registered. Waiting for next trigger...');
}

/**
 * Stops the cron scheduler
 */
export function stopScheduler(): void {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    console.log('[BlogAgent:Scheduler] Scheduler stopped.');
  }
}

/**
 * Manually triggers one blog post generation (useful for testing)
 */
export async function triggerManualRun(): Promise<void> {
  const config = loadBlogAgentConfig();
  await runBlogPipeline(config);
}

/**
 * Returns current scheduler status
 */
export function getSchedulerStatus(): SchedulerStatus {
  return { ...status };
}
