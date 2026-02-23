import { EventEmitter } from "events";
export interface SupabaseConfig { url: string; anonKey: string; serviceKey?: string; }
export class SupabaseIntegration extends EventEmitter {
  private config: SupabaseConfig;
  constructor(config: SupabaseConfig) { super(); this.config = config; }
  private async request(endpoint: string, method: string, body?: unknown): Promise<unknown> {
    const key = this.config.serviceKey || this.config.anonKey;
    const res = await fetch(`${this.config.url}/rest/v1${endpoint}`, { method, headers: { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json", "Prefer": method === "POST" ? "return=representation" : "" }, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
    return res.json();
  }
  async query(table: string, filters?: string): Promise<unknown> {
    const qs = filters ? `?${filters}` : "";
    return this.request(`/${table}${qs}`, "GET");
  }
  async insert(table: string, data: Record<string, unknown>): Promise<unknown> { return this.request(`/${table}`, "POST", data); }
  async update(table: string, id: string, data: Record<string, unknown>): Promise<unknown> { return this.request(`/${table}?id=eq.${id}`, "PATCH", data); }
  async remove(table: string, id: string): Promise<unknown> { return this.request(`/${table}?id=eq.${id}`, "DELETE"); }
  async rpc(fnName: string, params: Record<string, unknown>): Promise<unknown> {
    const key = this.config.serviceKey || this.config.anonKey;
    const res = await fetch(`${this.config.url}/rest/v1/rpc/${fnName}`, { method: "POST", headers: { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(params) });
    return res.json();
  }
}
