import { EventEmitter } from "events";
export interface GoogleConfig { accessToken: string; refreshToken?: string; clientId?: string; clientSecret?: string; }
export class GoogleWorkspace extends EventEmitter {
  private config: GoogleConfig;
  constructor(config: GoogleConfig) { super(); this.config = config; }
  private async request(url: string, method: string, body?: unknown): Promise<unknown> {
    const res = await fetch(url, { method, headers: { "Authorization": `Bearer ${this.config.accessToken}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) throw new Error(`Google API error: ${res.status}`);
    return res.json();
  }
  async listCalendarEvents(calendarId = "primary", maxResults = 10): Promise<unknown> {
    const now = new Date().toISOString();
    return this.request(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${now}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`, "GET");
  }
  async createCalendarEvent(summary: string, start: string, end: string, description?: string): Promise<unknown> {
    return this.request("https://www.googleapis.com/calendar/v3/calendars/primary/events", "POST", { summary, description, start: { dateTime: start }, end: { dateTime: end } });
  }
  async sendEmail(to: string, subject: string, body: string): Promise<unknown> {
    const raw = Buffer.from(`To: ${to}
Subject: ${subject}
Content-Type: text/html

${body}`).toString("base64url");
    return this.request("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", "POST", { raw });
  }
  async listEmails(maxResults = 10, query?: string): Promise<unknown> {
    const q = query ? `&q=${encodeURIComponent(query)}` : "";
    return this.request(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}${q}`, "GET");
  }
  async readSpreadsheet(spreadsheetId: string, range: string): Promise<unknown> {
    return this.request(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, "GET");
  }
  async writeSpreadsheet(spreadsheetId: string, range: string, values: string[][]): Promise<unknown> {
    return this.request(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`, "PUT", { values });
  }
}
