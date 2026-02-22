import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { appConfig } from "../config.js";

export class SpeechToText {
  private client: OpenAI | null = null;

  constructor() {
    if (appConfig.stt.enabled) {
      this.client = new OpenAI({ apiKey: appConfig.stt.apiKey });
    }
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  async transcribeFile(audioFilePath: string): Promise<string> {
    if (!this.client) {
      throw new Error("STT not configured. Set OPENAI_API_KEY in .env");
    }

    const fileStream = fs.createReadStream(audioFilePath);
    const response = await this.client.audio.transcriptions.create({
      model: appConfig.stt.model,
      file: fileStream,
      language: appConfig.stt.language,
    });

    return response.text;
  }

  async transcribeBuffer(buffer: Buffer, format: string = "wav"): Promise<string> {
    if (!this.client) {
      throw new Error("STT not configured. Set OPENAI_API_KEY in .env");
    }

    const tempFile = path.join(os.tmpdir(), `bibsclaw-stt-${Date.now()}.${format}`);
    fs.writeFileSync(tempFile, buffer);

    try {
      const result = await this.transcribeFile(tempFile);
      return result;
    } finally {
      try {
        fs.unlinkSync(tempFile);
      } catch {
        // ignore cleanup errors
      }
    }
  }
}
