import { EventEmitter } from "events";
export interface StripeConfig { secretKey: string; webhookSecret?: string; }
export class StripeIntegration extends EventEmitter {
  private config: StripeConfig;
  private apiUrl = "https://api.stripe.com/v1";
  constructor(config: StripeConfig) { super(); this.config = config; }
  private async request(endpoint: string, method: string, body?: Record<string, string>): Promise<unknown> {
    const headers: Record<string, string> = { "Authorization": `Bearer ${this.config.secretKey}` };
    let reqBody: string | undefined;
    if (body) { headers["Content-Type"] = "application/x-www-form-urlencoded"; reqBody = new URLSearchParams(body).toString(); }
    const res = await fetch(`${this.apiUrl}${endpoint}`, { method, headers, body: reqBody });
    if (!res.ok) throw new Error(`Stripe API error: ${res.status}`);
    return res.json();
  }
  async listPayments(limit = 10): Promise<unknown> { return this.request(`/payment_intents?limit=${limit}`, "GET"); }
  async getBalance(): Promise<unknown> { return this.request("/balance", "GET"); }
  async createInvoice(customerId: string, items: Array<{ description: string; amount: number }>): Promise<unknown> {
    const invoice = await this.request("/invoices", "POST", { customer: customerId, auto_advance: "true" });
    for (const item of items) { await this.request("/invoiceitems", "POST", { customer: customerId, amount: String(item.amount), currency: "usd", description: item.description }); }
    return invoice;
  }
  async listCustomers(limit = 10): Promise<unknown> { return this.request(`/customers?limit=${limit}`, "GET"); }
  async getSubscriptions(customerId: string): Promise<unknown> { return this.request(`/subscriptions?customer=${customerId}`, "GET"); }
}
