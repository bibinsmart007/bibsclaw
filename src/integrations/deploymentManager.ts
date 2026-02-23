import { EventEmitter } from "events";
export interface VercelConfig { token: string; teamId?: string; }
export interface RailwayConfig { token: string; projectId: string; }
export class DeploymentManager extends EventEmitter {
  private vercel?: VercelConfig;
  private railway?: RailwayConfig;
  constructor(vercel?: VercelConfig, railway?: RailwayConfig) { super(); this.vercel = vercel; this.railway = railway; }
  async vercelDeploy(projectName: string): Promise<unknown> {
    if (!this.vercel) throw new Error("Vercel not configured");
    const team = this.vercel.teamId ? `&teamId=${this.vercel.teamId}` : "";
    const res = await fetch(`https://api.vercel.com/v13/deployments?forceNew=1${team}`, { method: "POST", headers: { "Authorization": `Bearer ${this.vercel.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ name: projectName, target: "production" }) });
    if (!res.ok) throw new Error(`Vercel error: ${res.status}`);
    const data = await res.json(); this.emit("deployed", { platform: "vercel", data }); return data;
  }
  async vercelListDeployments(projectId: string, limit = 10): Promise<unknown> {
    if (!this.vercel) throw new Error("Vercel not configured");
    const res = await fetch(`https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=${limit}`, { headers: { "Authorization": `Bearer ${this.vercel.token}` } });
    return res.json();
  }
  async vercelGetLogs(deploymentId: string): Promise<unknown> {
    if (!this.vercel) throw new Error("Vercel not configured");
    const res = await fetch(`https://api.vercel.com/v2/deployments/${deploymentId}/events`, { headers: { "Authorization": `Bearer ${this.vercel.token}` } });
    return res.json();
  }
  async railwayGetStatus(): Promise<unknown> {
    if (!this.railway) throw new Error("Railway not configured");
    const res = await fetch("https://backboard.railway.app/graphql/v2", { method: "POST", headers: { "Authorization": `Bearer ${this.railway.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: `{ project(id: "${this.railway.projectId}") { name, environments { edges { node { name } } } } }` }) });
    return res.json();
  }
  async railwayRedeploy(serviceId: string, environmentId: string): Promise<unknown> {
    if (!this.railway) throw new Error("Railway not configured");
    const res = await fetch("https://backboard.railway.app/graphql/v2", { method: "POST", headers: { "Authorization": `Bearer ${this.railway.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: `mutation { serviceInstanceRedeploy(serviceId: "${serviceId}", environmentId: "${environmentId}") }` }) });
    const data = await res.json(); this.emit("deployed", { platform: "railway", data }); return data;
  }
}
