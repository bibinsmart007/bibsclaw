import type { ToolResult } from "./tools.js";

export async function httpRequest(
  url: string,
  method: string = "GET",
  headers?: Record<string, string>,
  body?: string
): Promise<ToolResult> {
  try {
    const blockedDomains = ["localhost", "127.0.0.1", "0.0.0.0", "169.254"];
    const urlObj = new URL(url);
    if (blockedDomains.some(d => urlObj.hostname.includes(d))) {
      return { success: false, output: "", error: "Blocked: cannot make requests to local/internal addresses" };
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const opts: RequestInit = {
      method: method.toUpperCase(),
      signal: controller.signal,
      headers: { "User-Agent": "BibsClaw/2.5", ...headers },
    };
    if (body && ["POST", "PUT", "PATCH"].includes(method.toUpperCase())) {
      opts.body = body;
      if (!headers?.["Content-Type"]) {
        (opts.headers as Record<string, string>)["Content-Type"] = "application/json";
      }
    }
    const res = await fetch(url, opts);
    clearTimeout(timeout);
    const responseText = await res.text();
    const truncated = responseText.slice(0, 10000);
    return {
      success: res.ok,
      output: `Status: ${res.status} ${res.statusText}\nHeaders: ${JSON.stringify(Object.fromEntries(res.headers.entries()))}\nBody:\n${truncated}`,
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err: any) {
    return { success: false, output: "", error: `HTTP error: ${err.message}` };
  }
}
