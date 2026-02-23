export interface EmailEvent { messageId: string; to: string; event: "sent" | "delivered" | "opened" | "clicked" | "bounced" | "unsubscribed"; timestamp: Date; metadata?: Record<string, string>; }
export interface EmailCampaignStats { campaignId: string; sent: number; delivered: number; opened: number; clicked: number; bounced: number; openRate: number; clickRate: number; bounceRate: number; }
export class EmailAnalytics {
  private events: EmailEvent[] = [];
  track(event: EmailEvent): void { this.events.push(event); }
  getCampaignStats(campaignId: string): EmailCampaignStats {
    const events = this.events.filter(e => e.metadata?.campaignId === campaignId);
    const sent = events.filter(e => e.event === "sent").length;
    const delivered = events.filter(e => e.event === "delivered").length;
    const opened = events.filter(e => e.event === "opened").length;
    const clicked = events.filter(e => e.event === "clicked").length;
    const bounced = events.filter(e => e.event === "bounced").length;
    return { campaignId, sent, delivered, opened, clicked, bounced, openRate: sent ? opened / sent : 0, clickRate: sent ? clicked / sent : 0, bounceRate: sent ? bounced / sent : 0 };
  }
  getRecentEvents(limit = 50): EmailEvent[] { return this.events.slice(-limit); }
  getEventsByRecipient(to: string): EmailEvent[] { return this.events.filter(e => e.to === to); }
}
