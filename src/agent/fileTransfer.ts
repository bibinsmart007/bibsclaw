import fs from "node:fs";
import path from "node:path";
import { logger } from "../middleware/logger.js";

const MAX_SIZE = 50 * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), ".bibsclaw", "uploads");
const DOWNLOAD_DIR = path.join(process.cwd(), ".bibsclaw", "downloads");

export interface TransferResult { success: boolean; filePath: string; size: number; mimeType?: string; }

export async function downloadFile(url: string, filename?: string): Promise<TransferResult> {
  logger.info(`Downloading: ${url}`);
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const ext = path.extname(new URL(url).pathname) || ".bin";
  const outName = filename || `download_${Date.now()}${ext}`;
  const outPath = path.join(DOWNLOAD_DIR, outName);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_SIZE) throw new Error(`File too large: ${buffer.length} bytes`);
  fs.writeFileSync(outPath, buffer);
  return { success: true, filePath: outPath, size: buffer.length, mimeType: res.headers.get("content-type") || undefined };
}

export function uploadFile(filePath: string, destDir?: string): TransferResult {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) throw new Error(`File not found: ${resolved}`);
  const stats = fs.statSync(resolved);
  if (stats.size > MAX_SIZE) throw new Error("File too large");
  const targetDir = destDir || UPLOAD_DIR;
  fs.mkdirSync(targetDir, { recursive: true });
  const outPath = path.join(targetDir, path.basename(resolved));
  fs.copyFileSync(resolved, outPath);
  logger.info(`Uploaded: ${outPath} (${stats.size} bytes)`);
  return { success: true, filePath: outPath, size: stats.size };
}

export function listUploads(): string[] { return fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR) : []; }
export function listDownloads(): string[] { return fs.existsSync(DOWNLOAD_DIR) ? fs.readdirSync(DOWNLOAD_DIR) : []; }
