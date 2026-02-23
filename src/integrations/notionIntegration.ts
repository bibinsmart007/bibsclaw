import { EventEmitter } from "events";
export interface NotionConfig { apiKey: string; defaultDbId?: string; }
export class NotionIntegration extends EventEmitter {
  private config: NotionConfig;
  private apiUrl = "https://api.notion.com/v1";
  constructor(config: NotionConfig) { super(); this.config = config; }
  private async request(endpoint: string, method: string, body?: unknown): Promise<unknown> {
    const res = await fetch(`${this.apiUrl}${endpoint}`, { method, headers: { "Authorization": `Bearer ${this.config.apiKey}`, "Content-Type": "application/json", "Notion-Version": "2022-06-28" }, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) throw new Error(`Notion API error: ${res.status}`);
    return res.json();
  }
  async queryDatabase(dbId: string, filter?: unknown): Promise<unknown> {
    return this.request(`/databases/${dbId}/query`, "POST", filter ? { filter } : {});
  }
  async createPage(parentDbId: string, properties: Record<string, unknown>, content?: string): Promise<unknown> {
    const body: Record<string, unknown> = { parent: { database_id: parentDbId }, properties };
    if (content) body.children = [{ object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content } }] } }];
    return this.request("/pages", "POST", body);
  }
  async updatePage(pageId: string, properties: Record<string, unknown>): Promise<unknown> {
    return this.request(`/pages/${pageId}`, "PATCH", { properties });
  }
  async getPage(pageId: string): Promise<unknown> { return this.request(`/pages/${pageId}`, "GET"); }
  async search(query: string): Promise<unknown> { return this.request("/search", "POST", { query }); }
}
