import { logger } from "../middleware/logger.js";
import fs from "node:fs";
import path from "node:path";

export interface RagDocument { id: string; content: string; metadata: Record<string, any>; embedding?: number[]; }
export interface RagQuery { query: string; topK?: number; threshold?: number; }
export interface RagResult { document: RagDocument; score: number; }

const documents: Map<string, RagDocument> = new Map();

export function addDocument(doc: RagDocument): void {
  documents.set(doc.id, doc);
  logger.info(`RAG: Added document ${doc.id}`);
}

export function removeDocument(id: string): boolean { return documents.delete(id); }

export function search(query: RagQuery): RagResult[] {
  const queryWords = new Set(query.query.toLowerCase().split(/\s+/));
  const results: RagResult[] = [];
  for (const doc of documents.values()) {
    const docWords = new Set(doc.content.toLowerCase().split(/\s+/));
    const intersection = [...queryWords].filter((w) => docWords.has(w)).length;
    const score = intersection / Math.max(queryWords.size, 1);
    if (score >= (query.threshold ?? 0.1)) results.push({ document: doc, score });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, query.topK ?? 5);
}

export function indexDirectory(dirPath: string, extensions = [".ts", ".js", ".md", ".json"]): number {
  let count = 0;
  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules" && entry.name !== "dist") walk(full);
      else if (entry.isFile() && extensions.includes(path.extname(entry.name))) {
        const content = fs.readFileSync(full, "utf-8");
        addDocument({ id: full, content, metadata: { path: full, ext: path.extname(entry.name), size: content.length } });
        count++;
      }
    }
  }
  walk(dirPath);
  logger.info(`RAG: Indexed ${count} files from ${dirPath}`);
  return count;
}

export function getStats(): { totalDocs: number; totalChars: number } {
  let totalChars = 0;
  for (const doc of documents.values()) totalChars += doc.content.length;
  return { totalDocs: documents.size, totalChars };
}
