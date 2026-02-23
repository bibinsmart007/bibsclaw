import type { ToolResult } from "./tools.js";

export async function fetchWebPage(url: string): Promise<ToolResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "BibsClaw/2.5 (AI Assistant)" },
    });
    clearTimeout(timeout);
    if (!res.ok) return { success: false, output: "", error: `HTTP ${res.status}: ${res.statusText}` };
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text")) return { success: false, output: "", error: `Unsupported content type: ${contentType}` };
    const html = await res.text();
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000);
    return { success: true, output: `URL: ${url}\nContent (truncated to 8000 chars):\n${text}` };
  } catch (err: any) {
    return { success: false, output: "", error: `Fetch error: ${err.message}` };
  }
}

export async function searchWeb(query: string): Promise<ToolResult> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { "User-Agent": "BibsClaw/2.5" } });
    if (!res.ok) return { success: false, output: "", error: `Search failed: ${res.status}` };
    const html = await res.text();
    const results: string[] = [];
    const regex = /class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)/g;
    let match;
    let count = 0;
    while ((match = regex.exec(html)) !== null && count < 5) {
      results.push(`${count + 1}. ${match[2].trim()} - ${match[1]}`);
      count++;
    }
    return { success: true, output: results.length > 0 ? results.join("\n") : "No results found" };
  } catch (err: any) {
    return { success: false, output: "", error: `Search error: ${err.message}` };
  }
}
