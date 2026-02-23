export interface ContentRequest { topic: string; platform: "twitter" | "instagram" | "linkedin" | "tiktok"; tone?: "professional" | "casual" | "humorous"; includeHashtags?: boolean; maxLength?: number; }
export interface GeneratedContent { text: string; hashtags: string[]; suggestedMedia?: string; scheduledTime?: string; }
export class ContentGenerator {
  async generate(request: ContentRequest): Promise<GeneratedContent> {
    const maxLen = request.maxLength || (request.platform === "twitter" ? 280 : 2200);
    const hashtagCount = request.platform === "instagram" ? 15 : 5;
    const prompt = `Generate a ${request.tone || "professional"} ${request.platform} post about: ${request.topic}. Max ${maxLen} chars.`;
    const hashtags = this.generateHashtags(request.topic, hashtagCount);
    return { text: prompt, hashtags, suggestedMedia: undefined, scheduledTime: undefined };
  }
  private generateHashtags(topic: string, count: number): string[] {
    const words = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const tags = words.slice(0, count).map(w => w.replace(/[^a-z0-9]/g, ""));
    return [...new Set(tags)].filter(Boolean);
  }
  generateVariations(content: GeneratedContent, count: number): GeneratedContent[] {
    return Array.from({ length: count }, (_, i) => ({ ...content, text: `${content.text} (v${i + 1})` }));
  }
}
