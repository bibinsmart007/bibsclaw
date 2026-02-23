import { EventEmitter } from "events";
export interface TrelloConfig { apiKey: string; token: string; }
export interface JiraConfig { domain: string; email: string; apiToken: string; }
export class ProjectManagement extends EventEmitter {
  private trello?: TrelloConfig;
  private jira?: JiraConfig;
  constructor(trello?: TrelloConfig, jira?: JiraConfig) { super(); this.trello = trello; this.jira = jira; }
  async trelloGetBoards(): Promise<unknown> {
    if (!this.trello) throw new Error("Trello not configured");
    const res = await fetch(`https://api.trello.com/1/members/me/boards?key=${this.trello.apiKey}&token=${this.trello.token}`);
    return res.json();
  }
  async trelloGetCards(boardId: string): Promise<unknown> {
    if (!this.trello) throw new Error("Trello not configured");
    const res = await fetch(`https://api.trello.com/1/boards/${boardId}/cards?key=${this.trello.apiKey}&token=${this.trello.token}`);
    return res.json();
  }
  async trelloCreateCard(listId: string, name: string, desc?: string): Promise<unknown> {
    if (!this.trello) throw new Error("Trello not configured");
    const res = await fetch(`https://api.trello.com/1/cards?key=${this.trello.apiKey}&token=${this.trello.token}&idList=${listId}&name=${encodeURIComponent(name)}&desc=${encodeURIComponent(desc || "")}`, { method: "POST" });
    return res.json();
  }
  async jiraGetIssues(project: string, maxResults = 50): Promise<unknown> {
    if (!this.jira) throw new Error("Jira not configured");
    const auth = Buffer.from(`${this.jira.email}:${this.jira.apiToken}`).toString("base64");
    const res = await fetch(`https://${this.jira.domain}/rest/api/3/search?jql=project=${project}&maxResults=${maxResults}`, { headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" } });
    return res.json();
  }
  async jiraCreateIssue(project: string, summary: string, description: string, issueType = "Task"): Promise<unknown> {
    if (!this.jira) throw new Error("Jira not configured");
    const auth = Buffer.from(`${this.jira.email}:${this.jira.apiToken}`).toString("base64");
    const res = await fetch(`https://${this.jira.domain}/rest/api/3/issue`, { method: "POST", headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" }, body: JSON.stringify({ fields: { project: { key: project }, summary, description: { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: description }] }] }, issuetype: { name: issueType } } }) });
    return res.json();
  }
  async jiraUpdateIssue(issueKey: string, fields: Record<string, unknown>): Promise<unknown> {
    if (!this.jira) throw new Error("Jira not configured");
    const auth = Buffer.from(`${this.jira.email}:${this.jira.apiToken}`).toString("base64");
    const res = await fetch(`https://${this.jira.domain}/rest/api/3/issue/${issueKey}`, { method: "PUT", headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" }, body: JSON.stringify({ fields }) });
    if (!res.ok) throw new Error(`Jira error: ${res.status}`);
    return { success: true };
  }
}
