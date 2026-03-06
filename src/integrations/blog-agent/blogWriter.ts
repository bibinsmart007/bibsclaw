// src/integrations/blog-agent/blogWriter.ts
// Uses Claude Haiku API to write SEO-optimized blog posts (~$0.05/post)

import Anthropic from '@anthropic-ai/sdk';
import type { BlogAgentConfig } from './config.js';
import type { BlogTopic } from './topicResearcher.js';

export interface BlogPost {
  title: string;
  slug: string;
  content: string;
  metaDescription: string;
  wordCount: number;
  faqSchema: string;
}

function buildInternalLinksContext(
  topic: BlogTopic,
  siteUrl: string
): string {
  return topic.internalLinksToInclude
    .map((link) => `- [${link.text}](${siteUrl}${link.path})`)
    .join('\n');
}

function buildFAQSchemaMarkup(faqs: { question: string; answer: string }[]): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
  return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
}

export async function writeBlogPost(
  config: BlogAgentConfig,
  topic: BlogTopic
): Promise<BlogPost> {
  const client = new Anthropic({ apiKey: config.anthropicApiKey });
  const internalLinksCtx = buildInternalLinksContext(topic, config.siteUrl);

  const prompt = `You are an expert SEO blog writer for AISocialGrowth (${config.siteUrl}), a social media marketing automation platform for e-commerce businesses.

Write a complete, high-quality blog post based on the following topic plan.

TOPIC: ${topic.title}
TARGET KEYWORD: ${topic.targetKeyword}
SECONDARY KEYWORDS: ${topic.secondaryKeywords.join(', ')}
META DESCRIPTION: ${topic.metaDescription}

OUTLINE:
${topic.outline.map((h, i) => `${i + 1}. ${h}`).join('\n')}

INTERNAL LINKS TO NATURALLY WEAVE IN:
${internalLinksCtx}

STRICT REQUIREMENTS:
1. Start with an H1 title: # ${topic.title}
2. Word count: 1500-2000 words (aim for 1800)
3. Use 4-6 H2 sections (## headings) following the outline
4. Use H3 subsections (### headings) within H2 sections where appropriate
5. Include the target keyword in the first 100 words, at least 2 H2 headings, and naturally throughout (1-2% density)
6. Include secondary keywords naturally throughout the post
7. Write in a conversational but professional tone — avoid fluff, be actionable
8. Include bullet points, numbered lists, and bold text for scannability
9. Naturally link to AISocialGrowth features using the internal links provided (use markdown link format)
10. Include a FAQ section with 4-5 questions and concise answers
11. End with a strong CTA paragraph encouraging readers to try AISocialGrowth
12. Do NOT include any meta description or frontmatter — just the blog content starting with H1

FAQ SECTION FORMAT (use this exact format):
## Frequently Asked Questions

### Q: [Question here]?
**A:** [Answer here in 2-3 sentences]

### Q: [Next question]?
**A:** [Answer here in 2-3 sentences]

WRITING GUIDELINES:
- Use short paragraphs (2-4 sentences max)
- Include real statistics and data points where relevant (cite year)
- Include practical, actionable tips — not generic advice
- Reference current trends and tools in the ${topic.niche} space
- Write for e-commerce business owners and digital marketers
- Maintain a helpful, authoritative voice throughout

Write the complete blog post now.`;

  const response = await client.messages.create({
    model: config.claudeModel,
    max_tokens: config.maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0].type === 'text' ? response.content[0].text : '';
  const wordCount = content.split(/\s+/).length;

  // Extract FAQs from the content for schema markup
  const faqRegex = /###\s*Q:\s*(.+?)\?\s*\n\s*\*\*A:\*\*\s*(.+?)(?=\n###|\n##|\n$|$)/gs;
  const faqs: { question: string; answer: string }[] = [];
  let match: RegExpExecArray | null;

  while ((match = faqRegex.exec(content)) !== null) {
    faqs.push({
      question: match[1].trim() + '?',
      answer: match[2].trim(),
    });
  }

  const faqSchema = faqs.length > 0 ? buildFAQSchemaMarkup(faqs) : '';

  // Log token usage for cost tracking
  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  // Claude 3 Haiku: $0.25/M input, $1.25/M output
  const estimatedCost = (inputTokens * 0.25 + outputTokens * 1.25) / 1_000_000;

  console.log(`[BlogAgent:Writer] Post written: "${topic.title}"`);
  console.log(`[BlogAgent:Writer] Word count: ${wordCount}`);
  console.log(`[BlogAgent:Writer] Tokens — input: ${inputTokens}, output: ${outputTokens}`);
  console.log(`[BlogAgent:Writer] Estimated cost: $${estimatedCost.toFixed(4)}`);
  console.log(`[BlogAgent:Writer] FAQs extracted for schema: ${faqs.length}`);

  return {
    title: topic.title,
    slug: topic.slug,
    content,
    metaDescription: topic.metaDescription,
    wordCount,
    faqSchema,
  };
}
