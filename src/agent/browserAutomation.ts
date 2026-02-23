import { logger } from "../middleware/logger.js";

export interface ScreenshotOptions { url: string; fullPage?: boolean; width?: number; height?: number; format?: "png" | "jpeg"; }
export interface ScreenshotResult { data: string; mimeType: string; width: number; height: number; }
export interface ScrapedPage { title: string; url: string; text: string; links: Array<{ text: string; href: string }>; }

export async function takeScreenshot(opts: ScreenshotOptions): Promise<ScreenshotResult> {
  logger.info(`Screenshot: ${opts.url}`);
  let puppeteer: any;
  try { puppeteer = await import("puppeteer"); } catch { throw new Error("puppeteer not installed. Run: npm install puppeteer"); }
  const browser = await puppeteer.default.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: opts.width || 1280, height: opts.height || 720 });
    await page.goto(opts.url, { waitUntil: "networkidle2", timeout: 30000 });
    const data = await page.screenshot({ encoding: "base64", fullPage: opts.fullPage ?? false, type: opts.format || "png" });
    return { data: data as string, mimeType: `image/${opts.format || "png"}`, width: opts.width || 1280, height: opts.height || 720 };
  } finally { await browser.close(); }
}

export async function scrapePage(url: string): Promise<ScrapedPage> {
  logger.info(`Scraping: ${url}`);
  let puppeteer: any;
  try { puppeteer = await import("puppeteer"); } catch { throw new Error("puppeteer not installed"); }
  const browser = await puppeteer.default.launch({ headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    const title = await page.title();
    const text = await page.evaluate(() => document.body.innerText);
    const links = await page.evaluate(() => Array.from(document.querySelectorAll("a[href]")).slice(0, 50).map((a: any) => ({ text: a.textContent?.trim() || "", href: a.href })));
    return { title, url, text: text.slice(0, 10000), links };
  } finally { await browser.close(); }
}
