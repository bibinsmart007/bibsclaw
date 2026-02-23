export interface PostMetrics { postId: string; platform: string; impressions: number; reach: number; engagement: number; likes: number; comments: number; shares: number; clicks: number; timestamp: Date; }
export interface PlatformSummary { platform: string; totalPosts: number; totalImpressions: number; avgEngagementRate: number; topPost: PostMetrics | null; }
export class SocialAnalytics {
  private metrics: PostMetrics[] = [];
  record(metric: PostMetrics): void { this.metrics.push(metric); }
  getSummary(platform?: string): PlatformSummary[] {
    const platforms = platform ? [platform] : [...new Set(this.metrics.map(m => m.platform))];
    return platforms.map(p => {
      const posts = this.metrics.filter(m => m.platform === p);
      const totalImpressions = posts.reduce((s, m) => s + m.impressions, 0);
      const avgEngagement = posts.length ? posts.reduce((s, m) => s + m.engagement, 0) / posts.length : 0;
      const topPost = posts.sort((a, b) => b.engagement - a.engagement)[0] || null;
      return { platform: p, totalPosts: posts.length, totalImpressions, avgEngagementRate: avgEngagement, topPost };
    });
  }
  getTimeSeries(platform: string, days: number): Array<{ date: string; impressions: number; engagement: number }> {
    const cutoff = new Date(Date.now() - days * 86400000);
    const posts = this.metrics.filter(m => m.platform === platform && m.timestamp >= cutoff);
    const byDate = new Map<string, { impressions: number; engagement: number }>();
    for (const p of posts) {
      const key = p.timestamp.toISOString().split("T")[0];
      const prev = byDate.get(key) || { impressions: 0, engagement: 0 };
      byDate.set(key, { impressions: prev.impressions + p.impressions, engagement: prev.engagement + p.engagement });
    }
    return Array.from(byDate.entries()).map(([date, data]) => ({ date, ...data })).sort((a, b) => a.date.localeCompare(b.date));
  }
  abTestResults(postIdA: string, postIdB: string): { winner: string; confidenceLevel: number; metrics: Record<string, { a: number; b: number }> } {
    const a = this.metrics.find(m => m.postId === postIdA);
    const b = this.metrics.find(m => m.postId === postIdB);
    if (!a || !b) return { winner: "unknown", confidenceLevel: 0, metrics: {} };
    const winner = a.engagement > b.engagement ? postIdA : postIdB;
    return { winner, confidenceLevel: Math.min(95, Math.abs(a.engagement - b.engagement) * 10), metrics: { engagement: { a: a.engagement, b: b.engagement }, impressions: { a: a.impressions, b: b.impressions } } };
  }
}
