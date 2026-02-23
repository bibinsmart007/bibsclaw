import { logger } from "../middleware/logger.js";

export interface WakeWordConfig { phrases: string[]; sensitivity: number; onDetected: (phrase: string) => void; }

const DEFAULT_PHRASES = ["hey bibsclaw", "ok bibsclaw", "bibsclaw"];

export class WakeWordDetector {
  private config: WakeWordConfig;
  private active = false;

  constructor(config?: Partial<WakeWordConfig>) {
    this.config = {
      phrases: config?.phrases || DEFAULT_PHRASES,
      sensitivity: config?.sensitivity ?? 0.7,
      onDetected: config?.onDetected || ((p) => logger.info(`Wake word detected: ${p}`)),
    };
  }

  start(): void {
    this.active = true;
    logger.info("Wake word detection started");
  }

  stop(): void {
    this.active = false;
    logger.info("Wake word detection stopped");
  }

  isActive(): boolean { return this.active; }

  processTranscript(transcript: string): boolean {
    if (!this.active) return false;
    const lower = transcript.toLowerCase().trim();
    for (const phrase of this.config.phrases) {
      if (lower.includes(phrase.toLowerCase())) {
        this.config.onDetected(phrase);
        return true;
      }
    }
    return false;
  }

  getCommand(transcript: string): string | null {
    const lower = transcript.toLowerCase();
    for (const phrase of this.config.phrases) {
      const idx = lower.indexOf(phrase.toLowerCase());
      if (idx >= 0) return transcript.slice(idx + phrase.length).trim() || null;
    }
    return null;
  }
}
