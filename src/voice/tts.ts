import { appConfig } from "../config.js";

export class TextToSpeech {
  private apiKey: string;
  private voiceId: string;
  private model: string;

  constructor() {
    this.apiKey = appConfig.tts.apiKey;
    this.voiceId = appConfig.tts.voiceId;
    this.model = appConfig.tts.model;
  }

  get enabled(): boolean {
    return appConfig.tts.enabled;
  }

  async synthesize(text: string): Promise<Buffer> {
    if (!this.enabled) {
      throw new Error("TTS not configured. Set ELEVENLABS_API_KEY in .env");
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": this.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: this.model,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs TTS error (${response.status}): ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async synthesizeToBase64(text: string): Promise<string> {
    const buffer = await this.synthesize(text);
    return buffer.toString("base64");
  }
}
