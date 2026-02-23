import { logger } from "../middleware/logger.js";

export interface StreamingTtsOptions { voiceId?: string; model?: string; onChunk?: (chunk: Buffer) => void; }

export async function* streamTts(text: string, opts: StreamingTtsOptions = {}): AsyncGenerator<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ElevenLabs API key required");
  const voiceId = opts.voiceId || process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
  logger.info(`Streaming TTS: ${text.slice(0, 50)}...`);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
    body: JSON.stringify({ text, model_id: opts.model || "eleven_monolingual_v1", voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
  });
  if (!res.ok) throw new Error(`TTS stream error: ${res.status}`);
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No stream body");
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = Buffer.from(value);
    opts.onChunk?.(chunk);
    yield chunk;
  }
}

export async function streamTtsToBuffer(text: string, opts: StreamingTtsOptions = {}): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of streamTts(text, opts)) chunks.push(chunk);
  return Buffer.concat(chunks);
}
