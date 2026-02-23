import { EventEmitter } from "events";
export interface TwitterConfig { apiKey: string; apiSecret: string; accessToken: string; accessSecret: string; }
export interface Tweet { text: string; mediaIds?: string[]; replyTo?: string; }
export class TwitterClient extends EventEmitter {
  private config: TwitterConfig;
  private baseUrl = "https://api.twitter.com/2";
  constructor(config: TwitterConfig) { super(); this.config = config; }
  private async request(endpoint: string, method: string, body?: unknown): Promise<unknown> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = { "Content-Type": "application/json", "Authorization": `Bearer ${this.config.accessToken}` };
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) throw new Error(`Twitter API error: ${res.status} ${res.statusText}`);
    return res.json();
  }
  async postTweet(tweet: Tweet): Promise<unknown> {
    const result = await this.request("/tweets", "POST", { text: tweet.text, reply: tweet.replyTo ? { in_reply_to_tweet_id: tweet.replyTo } : undefined });
    this.emit("tweetPosted", { text: tweet.text }); return result;
  }
  async deleteTweet(id: string): Promise<void> { await this.request(`/tweets/${id}`, "DELETE"); }
  async getTimeline(userId: string, maxResults = 10): Promise<unknown> { return this.request(`/users/${userId}/tweets?max_results=${maxResults}`, "GET"); }
  async searchTweets(query: string, maxResults = 10): Promise<unknown> { return this.request(`/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${maxResults}`, "GET"); }
}
