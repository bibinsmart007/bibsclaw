import { logger } from "../middleware/logger.js";

export interface OllamaOptions {
  model?: string;
  baseUrl?: string;
  temperature?: number;
}

const DEFAULT_URL = "http://localhost:11434";
const DEFAULT_MODEL = "llama3";

export async function ollamaChat(
  messages: Array<{ role: string; content: string }>,
  opts: OllamaOptions = {}
): Promise<string> {
  const baseUrl = opts.baseUrl || process.env.OLLAMA_BASE_URL || DEFAULT_URL;
  const model = opts.model || process.env.OLLAMA_MODEL || DEFAULT_MODEL;
  logger.info(`Ollama request: ${model} at ${baseUrl}`);
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: false, options: { temperature: opts.temperature ?? 0.7 } }),
  });
  if (!res.ok) throw new Error(`Ollama error ${res.status}`);
  const data = await res.json() as { message?: { content?: string } };
  return data?.message?.content ?? "";
}

export async function ollamaListModels(baseUrl?: string): Promise<string[]> {
  try {
    const res = await fetch(`${baseUrl || process.env.OLLAMA_BASE_URL || DEFAULT_URL}/api/tags`);
    const data = await res.json() as { models?: Array<{ name: string }> };
    return (data?.models ?? []).map((m) => m.name);
  } catch { return []; }
}

export async function ollamaIsAvailable(baseUrl?: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl || process.env.OLLAMA_BASE_URL || DEFAULT_URL}/api/tags`);
    return res.ok;
  } catch { return false; }
}
