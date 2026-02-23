import { logger } from "../middleware/logger.js";

export interface VoiceCloneOptions { name: string; description?: string; labels?: Record<string, string>; }
export interface ClonedVoice { voiceId: string; name: string; }

export async function cloneVoice(audioFiles: Buffer[], opts: VoiceCloneOptions): Promise<ClonedVoice> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ElevenLabs API key required for voice cloning");
  logger.info(`Cloning voice: ${opts.name} with ${audioFiles.length} samples`);
  const formData = new FormData();
  formData.append("name", opts.name);
  if (opts.description) formData.append("description", opts.description);
  if (opts.labels) formData.append("labels", JSON.stringify(opts.labels));
  audioFiles.forEach((file, i) => formData.append("files", new Blob([file]), `sample_${i}.mp3`));
  const res = await fetch("https://api.elevenlabs.io/v1/voices/add", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: formData,
  });
  if (!res.ok) throw new Error(`Voice cloning error: ${res.status}`);
  const data = await res.json() as { voice_id?: string };
  return { voiceId: data.voice_id || "", name: opts.name };
}

export async function listVoices(): Promise<Array<{ voiceId: string; name: string; category: string }>> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return [];
  const res = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": apiKey } });
  if (!res.ok) return [];
  const data = await res.json() as { voices?: Array<{ voice_id: string; name: string; category: string }> };
  return (data?.voices ?? []).map((v) => ({ voiceId: v.voice_id, name: v.name, category: v.category }));
}

export async function deleteVoice(voiceId: string): Promise<boolean> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return false;
  const res = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, { method: "DELETE", headers: { "xi-api-key": apiKey } });
  return res.ok;
}
