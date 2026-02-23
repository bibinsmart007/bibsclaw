import { EventEmitter } from "events";
export interface ShopifyConfig { shopDomain: string; accessToken: string; }
export class ShopifyIntegration extends EventEmitter {
  private config: ShopifyConfig;
  constructor(config: ShopifyConfig) { super(); this.config = config; }
  private async request(endpoint: string, method: string, body?: unknown): Promise<unknown> {
    const url = `https://${this.config.shopDomain}/admin/api/2024-01${endpoint}`;
    const res = await fetch(url, { method, headers: { "X-Shopify-Access-Token": this.config.accessToken, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) throw new Error(`Shopify API error: ${res.status}`);
    return res.json();
  }
  async listProducts(limit = 50): Promise<unknown> { return this.request(`/products.json?limit=${limit}`, "GET"); }
  async getProduct(id: number): Promise<unknown> { return this.request(`/products/${id}.json`, "GET"); }
  async listOrders(status = "any", limit = 50): Promise<unknown> { return this.request(`/orders.json?status=${status}&limit=${limit}`, "GET"); }
  async getOrder(id: number): Promise<unknown> { return this.request(`/orders/${id}.json`, "GET"); }
  async updateInventory(inventoryItemId: number, quantity: number, locationId: number): Promise<unknown> {
    return this.request("/inventory_levels/set.json", "POST", { inventory_item_id: inventoryItemId, available: quantity, location_id: locationId });
  }
  async getCustomers(limit = 50): Promise<unknown> { return this.request(`/customers.json?limit=${limit}`, "GET"); }
  async createProduct(title: string, bodyHtml: string, vendor: string, price: string): Promise<unknown> {
    return this.request("/products.json", "POST", { product: { title, body_html: bodyHtml, vendor, variants: [{ price }] } });
  }
}
