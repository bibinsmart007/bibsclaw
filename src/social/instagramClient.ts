import { EventEmitter } from "events";
export interface InstagramConfig { accessToken: string; businessAccountId: string; }
export interface InstagramPost { imageUrl?: string; videoUrl?: string; caption: string; hashtags?: string[]; }
export class InstagramClient extends EventEmitter {
  private config: InstagramConfig;
  private graphUrl = "https://graph.facebook.com/v18.0";
  constructor(config: InstagramConfig) { super(); this.config = config; }
  private async request(endpoint: string, method: string, body?: Record<string, string>): Promise<unknown> {
    const url = `${this.graphUrl}${endpoint}`;
    const params = new URLSearchParams({ access_token: this.config.accessToken, ...body });
    const res = await fetch(method === "GET" ? `${url}?${params}` : url, { method, headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: method !== "GET" ? params.toString() : undefined });
    if (!res.ok) throw new Error(`Instagram API error: ${res.status}`);
    return res.json();
  }
  async createMediaContainer(post: InstagramPost): Promise<string> {
    const caption = post.hashtags ? `${post.caption} ${post.hashtags.map(h => "#" + h).join(" ")}` : post.caption;
    const body: Record<string, string> = { caption };
    if (post.imageUrl) body.image_url = post.imageUrl;
    if (post.videoUrl) { body.video_url = post.videoUrl; body.media_type = "REELS"; }
    const result = await this.request(`/${this.config.businessAccountId}/media`, "POST", body) as { id: string };
    return result.id;
  }
  async publishMedia(containerId: string): Promise<unknown> {
    const result = await this.request(`/${this.config.businessAccountId}/media_publish`, "POST", { creation_id: containerId });
    this.emit("mediaPublished", { containerId }); return result;
  }
  async getInsights(mediaId: string): Promise<unknown> { return this.request(`/${mediaId}/insights?metric=impressions,reach,engagement`, "GET"); }
  async post(p: InstagramPost): Promise<unknown> { const cid = await this.createMediaContainer(p); return this.publishMedia(cid); }
}
