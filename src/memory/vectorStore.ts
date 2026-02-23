import { logger } from "../middleware/logger.js";

export interface VectorEntry { id: string; vector: number[]; metadata: Record<string, any>; }

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; magA += a[i] * a[i]; magB += b[i] * b[i]; }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export class VectorStore {
  private entries: VectorEntry[] = [];

  add(entry: VectorEntry): void { this.entries.push(entry); }

  remove(id: string): boolean {
    const idx = this.entries.findIndex((e) => e.id === id);
    if (idx >= 0) { this.entries.splice(idx, 1); return true; }
    return false;
  }

  search(query: number[], topK = 5): Array<VectorEntry & { score: number }> {
    return this.entries
      .map((e) => ({ ...e, score: cosineSimilarity(query, e.vector) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  size(): number { return this.entries.length; }
  clear(): void { this.entries = []; }
}

export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_CHAT_API_KEY;
  if (!apiKey) {
    logger.warn("No OpenAI key for embeddings, using simple hash");
    return simpleHash(text);
  }
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!res.ok) return simpleHash(text);
  const data = await res.json() as { data?: Array<{ embedding: number[] }> };
  return data?.data?.[0]?.embedding ?? simpleHash(text);
}

function simpleHash(text: string): number[] {
  const vec = new Array(128).fill(0);
  for (let i = 0; i < text.length; i++) vec[i % 128] += text.charCodeAt(i) / 1000;
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return mag > 0 ? vec.map((v) => v / mag) : vec;
}
