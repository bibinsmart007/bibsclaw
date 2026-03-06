// src/integrations/blog-agent/blogPublisher.ts
// Inserts blog posts into Supabase 'blog_posts' table

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { BlogAgentConfig } from './config.js';
import type { BlogPost } from './blogWriter.js';

export interface PublishedPost {
  id: string;
  title: string;
  slug: string;
  status: string;
  published_at: string;
}

interface BlogPostRow {
  id: string;
  title: string;
  slug: string;
  content: string;
  meta_description: string;
  faq_schema: string;
  word_count: number;
  author: string;
  status: string;
  published_at: string;
  created_at: string;
  updated_at: string;
}

function getSupabaseClient(config: BlogAgentConfig): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
}

/**
 * Checks if a post with the same slug already exists to prevent duplicates
 */
async function slugExists(
  supabase: SupabaseClient,
  slug: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('slug', slug)
    .limit(1);

  if (error) {
    console.warn(`[BlogAgent:Publisher] Slug check warning: ${error.message}`);
    return false;
  }

  return (data?.length ?? 0) > 0;
}

/**
 * Generates a unique slug by appending a numeric suffix if needed
 */
async function ensureUniqueSlug(
  supabase: SupabaseClient,
  baseSlug: string
): Promise<string> {
  let slug = baseSlug;
  let attempt = 1;

  while (await slugExists(supabase, slug)) {
    slug = `${baseSlug}-${attempt}`;
    attempt++;
    if (attempt > 10) {
      // Fallback: append timestamp
      slug = `${baseSlug}-${Date.now()}`;
      break;
    }
  }

  return slug;
}

/**
 * Publishes a blog post to the Supabase 'blog_posts' table.
 *
 * Expected table schema:
 * CREATE TABLE blog_posts (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   title TEXT NOT NULL,
 *   slug TEXT NOT NULL UNIQUE,
 *   content TEXT NOT NULL,
 *   meta_description TEXT,
 *   faq_schema TEXT,
 *   word_count INTEGER,
 *   author TEXT NOT NULL DEFAULT 'AISocialGrowth Team',
 *   status TEXT NOT NULL DEFAULT 'published',
 *   published_at TIMESTAMPTZ DEFAULT NOW(),
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 */
export async function publishBlogPost(
  config: BlogAgentConfig,
  post: BlogPost
): Promise<PublishedPost> {
  const supabase = getSupabaseClient(config);
  const now = new Date().toISOString();
  const uniqueSlug = await ensureUniqueSlug(supabase, post.slug);

  const row = {
    title: post.title,
    slug: uniqueSlug,
    content: post.content,
    meta_description: post.metaDescription,
    faq_schema: post.faqSchema || null,
    word_count: post.wordCount,
    author: config.author,
    status: 'published',
    published_at: now,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('blog_posts')
    .insert(row)
    .select('id, title, slug, status, published_at')
    .single();

  if (error) {
    console.error(`[BlogAgent:Publisher] Supabase insert failed:`, error);
    throw new Error(`Failed to publish blog post: ${error.message}`);
  }

  const published = data as PublishedPost;

  console.log(`[BlogAgent:Publisher] Published: "${published.title}"`);
  console.log(`[BlogAgent:Publisher] Slug: ${published.slug}`);
  console.log(`[BlogAgent:Publisher] ID: ${published.id}`);
  console.log(`[BlogAgent:Publisher] Time: ${published.published_at}`);

  return published;
}

/**
 * Retrieves recent blog posts for verification/monitoring
 */
export async function getRecentPosts(
  config: BlogAgentConfig,
  limit: number = 5
): Promise<BlogPostRow[]> {
  const supabase = getSupabaseClient(config);

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`[BlogAgent:Publisher] Failed to fetch recent posts:`, error);
    return [];
  }

  return (data as BlogPostRow[]) || [];
}
