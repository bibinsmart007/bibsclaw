import { EventEmitter } from "events";
export interface LinkedInConfig { accessToken: string; personUrn: string; }
export interface LinkedInPost { text: string; imageUrl?: string; visibility?: "PUBLIC" | "CONNECTIONS"; }
export class LinkedInClient extends EventEmitter {
  private config: LinkedInConfig;
  private apiUrl = "https://api.linkedin.com/v2";
  constructor(config: LinkedInConfig) { super(); this.config = config; }
  private async request(endpoint: string, method: string, body?: unknown): Promise<unknown> {
    const res = await fetch(`${this.apiUrl}${endpoint}`, { method, headers: { "Authorization": `Bearer ${this.config.accessToken}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" }, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) throw new Error(`LinkedIn API error: ${res.status}`);
    return res.json();
  }
  async createPost(post: LinkedInPost): Promise<unknown> {
    const body = { author: this.config.personUrn, lifecycleState: "PUBLISHED", specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text: post.text }, shareMediaCategory: post.imageUrl ? "IMAGE" : "NONE" } }, visibility: { "com.linkedin.ugc.MemberNetworkVisibility": post.visibility || "PUBLIC" } };
    const result = await this.request("/ugcPosts", "POST", body);
    this.emit("postCreated", { text: post.text }); return result;
  }
  async getProfile(): Promise<unknown> { return this.request("/me", "GET"); }
  async getConnections(): Promise<unknown> { return this.request("/connections?q=viewer&start=0&count=50", "GET"); }
}
