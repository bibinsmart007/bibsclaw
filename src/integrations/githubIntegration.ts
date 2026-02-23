import { EventEmitter } from "events";
export interface GitHubConfig { token: string; owner: string; repo: string; }
export class GitHubIntegration extends EventEmitter {
  private config: GitHubConfig;
  private apiUrl = "https://api.github.com";
  constructor(config: GitHubConfig) { super(); this.config = config; }
  private async request(endpoint: string, method: string, body?: unknown): Promise<unknown> {
    const res = await fetch(`${this.apiUrl}${endpoint}`, { method, headers: { "Authorization": `Bearer ${this.config.token}`, "Accept": "application/vnd.github.v3+json", "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    return res.json();
  }
  async createPR(title: string, head: string, base: string, body: string): Promise<unknown> {
    return this.request(`/repos/${this.config.owner}/${this.config.repo}/pulls`, "POST", { title, head, base, body });
  }
  async createIssue(title: string, body: string, labels?: string[]): Promise<unknown> {
    return this.request(`/repos/${this.config.owner}/${this.config.repo}/issues`, "POST", { title, body, labels });
  }
  async listIssues(state: "open" | "closed" | "all" = "open"): Promise<unknown> {
    return this.request(`/repos/${this.config.owner}/${this.config.repo}/issues?state=${state}`, "GET");
  }
  async reviewPR(prNumber: number, event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT", body: string): Promise<unknown> {
    return this.request(`/repos/${this.config.owner}/${this.config.repo}/pulls/${prNumber}/reviews`, "POST", { event, body });
  }
  async getRepoInfo(): Promise<unknown> { return this.request(`/repos/${this.config.owner}/${this.config.repo}`, "GET"); }
  async listActions(): Promise<unknown> { return this.request(`/repos/${this.config.owner}/${this.config.repo}/actions/runs`, "GET"); }
}
