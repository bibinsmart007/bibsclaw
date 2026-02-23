import { logger } from "../middleware/logger.js";

export interface ImageGenOptions {
  provider?: "dalle" | "stability";
  model?: string;
  size?: string;
  quality?: string;
  n?: number;
}

export interface GeneratedImage {
  url?: string;
  b64Data?: string;
  revisedPrompt?: string;
}

export async function generateImage(prompt: string, opts: ImageGenOptions = {}): Promise<GeneratedImage> {
  const provider = opts.provider || "dalle";
  logger.info(`Image generation via ${provider}`);
  if (provider === "dalle") return dalleGenerate(prompt, opts);
  if (provider === "stability") return stabilityGenerate(prompt, opts);
  throw new Error(`Unknown provider: ${provider}`);
}

async function dalleGenerate(prompt: string, opts: ImageGenOptions): Promise<GeneratedImage> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_CHAT_API_KEY;
  if (!apiKey) throw new Error("No OpenAI API key for DALL-E");
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: opts.model || "dall-e-3", prompt, n: opts.n || 1, size: opts.size || "1024x1024", quality: opts.quality || "standard" }),
  });
  if (!res.ok) throw new Error(`DALL-E error ${res.status}`);
  const data = await res.json() as { data?: Array<{ url?: string; revised_prompt?: string }> };
  const img = data?.data?.[0];
  return { url: img?.url, revisedPrompt: img?.revised_prompt };
}

async function stabilityGenerate(prompt: string, opts: ImageGenOptions): Promise<GeneratedImage> {
  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) throw new Error("No Stability API key");
  const res = await fetch(`https://api.stability.ai/v1/generation/${opts.model || "stable-diffusion-xl-1024-v1-0"}/text-to-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    body: JSON.stringify({ text_prompts: [{ text: prompt, weight: 1 }], cfg_scale: 7, height: 1024, width: 1024, steps: 30, samples: opts.n || 1 }),
  });
  if (!res.ok) throw new Error(`Stability error ${res.status}`);
  const data = await res.json() as { artifacts?: Array<{ base64?: string }> };
  return { b64Data: data?.artifacts?.[0]?.base64 };
}
