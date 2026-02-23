import { logger } from "../middleware/logger.js";
import fs from "node:fs";
import path from "node:path";

export interface UploadedDocument { id: string; name: string; type: string; content: string; uploadedAt: Date; size: number; }

const uploadedDocs: Map<string, UploadedDocument> = new Map();

export function processDocument(filePath: string): UploadedDocument {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
  const ext = path.extname(filePath).toLowerCase();
  const content = extractText(filePath, ext);
  const doc: UploadedDocument = {
    id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: path.basename(filePath),
    type: ext,
    content,
    uploadedAt: new Date(),
    size: fs.statSync(filePath).size,
  };
  uploadedDocs.set(doc.id, doc);
  logger.info(`Document uploaded: ${doc.name} (${doc.size} bytes)`);
  return doc;
}

function extractText(filePath: string, ext: string): string {
  if ([".txt", ".md", ".csv", ".json", ".ts", ".js", ".html", ".css"].includes(ext)) return fs.readFileSync(filePath, "utf-8");
  if (ext === ".pdf") return `[PDF file: ${path.basename(filePath)} - text extraction requires pdf-parse package]`;
  return `[Binary file: ${path.basename(filePath)} - ${fs.statSync(filePath).size} bytes]`;
}

export function queryDocument(docId: string, question: string): string {
  const doc = uploadedDocs.get(docId);
  if (!doc) throw new Error(`Document not found: ${docId}`);
  const words = question.toLowerCase().split(/\s+/);
  const lines = doc.content.split("\n");
  const scored = lines.map((line, i) => {
    const lower = line.toLowerCase();
    const score = words.filter((w) => lower.includes(w)).length;
    return { line, lineNum: i + 1, score };
  }).filter((l) => l.score > 0).sort((a, b) => b.score - a.score);
  if (scored.length === 0) return "No relevant content found for this question.";
  return scored.slice(0, 5).map((l) => `Line ${l.lineNum}: ${l.line.trim().slice(0, 200)}`).join("\n");
}

export function listDocuments(): UploadedDocument[] { return Array.from(uploadedDocs.values()); }
export function getDocument(id: string): UploadedDocument | undefined { return uploadedDocs.get(id); }
export function removeDocument(id: string): boolean { return uploadedDocs.delete(id); }
