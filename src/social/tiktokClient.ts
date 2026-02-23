import { EventEmitter } from "events";
export interface TikTokConfig { accessToken: string; openId: string; }
export interface TikTokVideo { videoUrl: string; title: string; description?: string; privacyLevel?: "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "SELF_ONLY"; }
export class TikTokClient extends EventEmitter {
  private config: TikTokConfig;
  private apiUrl = "https://open.tiktokapis.com/v2";
  constructor(config: TikTokConfig) { super(); this.config = config; }
  private async request(endpoint: string, method: string, body?: unknown): Promise<unknown> {
    const res = await fetch(`${this.apiUrl}${endpoint}`, { method, headers: { "Authorization": `Bearer ${this.config.accessToken}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) throw new Error(`TikTok API error: ${res.status}`);
    return res.json();
  }
  async initUpload(video: TikTokVideo): Promise<unknown> {
    const body = { post_info: { title: video.title, description: video.description || "", privacy_level: video.privacyLevel || "PUBLIC_TO_EVERYONE" }, source_info: { source: "PULL_FROM_URL", video_url: video.videoUrl } };
    const result = await this.request("/post/publish/video/init/", "POST", body);
    this.emit("uploadInitiated", { title: video.title }); return result;
  }
  async getVideoList(): Promise<unknown> { return this.request(`/video/list/?open_id=${this.config.openId}`, "POST", { max_count: 20 }); }
  async getUserInfo(): Promise<unknown> { return this.request("/user/info/", "GET"); }
}
