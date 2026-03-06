// src/integrations/blog-agent/topicResearcher.ts
// Generates SEO-optimized blog topic ideas using trending keyword patterns

import Anthropic from '@anthropic-ai/sdk';
import { type BlogAgentConfig, BLOG_NICHES, INTERNAL_LINKS } from './config.js';

export interface BlogTopic {
  title: string;
  slug: string;
  metaDescription: string;
  targetKeyword: string;
  secondaryKeywords: string[];
  niche: string;
  outline: string[];
  internalLinksToInclude: { text: string; path: string }[];
}

// Trending keyword patterns by quarter/season for freshness
const TRENDING_PATTERNS: Record<string, string[]> = {
  Q1: [
    'new year marketing strategy',
    'social media trends {year}',
    'e-commerce predictions {year}',
    'AI marketing tools {year}',
    'content calendar planning',
    'Instagram algorithm changes {year}',
  ],
  Q2: [
    'summer marketing campaigns',
    'mid-year social media audit',
    'back-to-school e-commerce prep',
    'TikTok growth strategies',
    'influencer marketing ROI',
    'email list building strategies',
  ],
  Q3: [
    'holiday season prep for e-commerce',
    'Black Friday marketing strategy',
    'Q4 social media planning',
    'video marketing for product launches',
    'Pinterest marketing for holiday sales',
    'retargeting strategies for Q4',
  ],
  Q4: [
    'year-end marketing wrap-up',
    'Cyber Monday social media tactics',
    'holiday email marketing sequences',
    'new year content strategy',
    'Christmas social media campaigns',
    'end of year analytics review',
  ],
};

const EVERGREEN_FORMATS = [
  'How to {action} in {year}: A Complete Guide',
  '{number} {adjective} Ways to {action} for Your {business_type}',
  '{topic} vs {topic}: Which Is Better for {goal}?',
  'The Ultimate Guide to {topic} for {audience}',
  'Why {topic} Matters for {business_type} in {year}',
  '{topic}: {number} Mistakes You\'re Making (And How to Fix Them)',
  'How {brand_type} Use {topic} to {outcome}',
  'A Step-by-Step Guide to {action} with {tool}',
  '{number} Proven {topic} Strategies That Actually Work',
  'Beginner\'s Guide to {topic}: Everything You Need to Know',
];

function getCurrentQuarter(): string {
  const month = new Date().getMonth();
  if (month < 3) return 'Q1';
  if (month < 6) return 'Q2';
  if (month < 9) return 'Q3';
  return 'Q4';
}

function selectRelevantInternalLinks(niche: string): { text: string; path: string }[] {
  const relevanceMap: Record<string, string[]> = {
    'social media marketing': ['AI Content Studio', 'Post Scheduler', 'Social Publisher', 'Analytics'],
    'AI tools for business': ['AI Content Studio', 'Video Studio', 'Ad Copy Studio', 'Website Analyzer'],
    'e-commerce growth': ['Store Integration', 'Analytics', 'Ad Copy Studio', 'SEO Dashboard'],
    'Instagram marketing': ['AI Content Studio', 'Post Scheduler', 'Social Publisher', 'Media Planner'],
    'TikTok marketing': ['Video Studio', 'AI Content Studio', 'Social Publisher', 'Analytics'],
    'content creation': ['AI Content Studio', 'Template Library', 'Media Planner', 'Video Studio'],
    'SEO strategy': ['SEO Dashboard', 'Website Analyzer', 'AI Content Studio', 'Analytics'],
    'email marketing automation': ['AI Content Studio', 'Analytics', 'Template Library', 'Ad Copy Studio'],
    'influencer marketing': ['Competitor Intel', 'Analytics', 'Social Publisher', 'AI Content Studio'],
    'Shopify store optimization': ['Store Integration', 'SEO Dashboard', 'Website Analyzer', 'Analytics'],
    'Facebook ads': ['Ad Copy Studio', 'Analytics', 'AI Content Studio', 'Competitor Intel'],
    'social media analytics': ['Analytics', 'Competitor Intel', 'SEO Dashboard', 'Social Publisher'],
    'brand building': ['AI Content Studio', 'Template Library', 'Social Publisher', 'Media Planner'],
    'video marketing': ['Video Studio', 'AI Content Studio', 'Social Publisher', 'Media Planner'],
    'dropshipping': ['Store Integration', 'Ad Copy Studio', 'SEO Dashboard', 'Analytics'],
  };

  const features = relevanceMap[niche] || ['AI Content Studio', 'Analytics', 'Post Scheduler'];
  return features.slice(0, 3).map((name) => ({
    text: name,
    path: INTERNAL_LINKS[name] || '/',
  }));
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export async function researchTopic(config: BlogAgentConfig): Promise<BlogTopic> {
  const client = new Anthropic({ apiKey: config.anthropicApiKey });
  const year = new Date().getFullYear();
  const quarter = getCurrentQuarter();
  const trendingTopics = TRENDING_PATTERNS[quarter].map((t) => t.replace('{year}', String(year)));
  const randomNiche = BLOG_NICHES[Math.floor(Math.random() * BLOG_NICHES.length)];
  const randomFormats = EVERGREEN_FORMATS.sort(() => Math.random() - 0.5).slice(0, 3);
  const internalLinks = selectRelevantInternalLinks(randomNiche);

  const prompt = `You are an SEO content strategist for AISocialGrowth (${config.siteUrl}), a social media marketing automation platform for e-commerce businesses.

Generate ONE highly specific, SEO-optimized blog post topic.

CONTEXT:
- Niche focus: ${randomNiche}
- Current quarter: ${quarter} ${year}
- Trending topics this quarter: ${trendingTopics.join(', ')}
- Title format inspiration (adapt, don't copy exactly): ${randomFormats.join(' | ')}
- Internal features to reference: ${internalLinks.map((l) => l.text).join(', ')}

REQUIREMENTS:
- Title must include the target year (${year}) or be evergreen
- Target a long-tail keyword (3-5 words) with moderate search volume
- Meta description must be exactly 140-155 characters, compelling, include the keyword
- Outline should have 4-6 H2 sections that flow logically
- Include an FAQ section and a conclusion with CTA as part of the outline

Respond in this exact JSON format (no markdown, no code blocks):
{
  "title": "...",
  "targetKeyword": "...",
  "secondaryKeywords": ["kw1", "kw2", "kw3"],
  "metaDescription": "...",
  "outline": ["H2: ...", "H2: ...", "H2: ...", "H2: ...", "H2: FAQ", "H2: Conclusion"]
}`;

  const response = await client.messages.create({
    model: config.claudeModel,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  let parsed: {
    title: string;
    targetKeyword: string;
    secondaryKeywords: string[];
    metaDescription: string;
    outline: string[];
  };

  try {
    // Extract JSON from response (handle possible markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('[BlogAgent:TopicResearcher] Failed to parse topic response:', text);
    throw new Error(`Topic research failed: ${(err as Error).message}`);
  }

  // Enforce meta description length
  let metaDesc = parsed.metaDescription;
  if (metaDesc.length > 155) {
    metaDesc = metaDesc.slice(0, 152) + '...';
  }

  return {
    title: parsed.title,
    slug: slugify(parsed.title),
    metaDescription: metaDesc,
    targetKeyword: parsed.targetKeyword,
    secondaryKeywords: parsed.secondaryKeywords,
    niche: randomNiche,
    outline: parsed.outline,
    internalLinksToInclude: internalLinks,
  };
}
