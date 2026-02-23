import { logger } from "../middleware/logger.js";

export interface ContinuousModeConfig { silenceTimeout: number; maxDuration: number; onSpeechStart?: () => void; onSpeechEnd?: (transcript: string) => void; onTimeout?: () => void; }

export class ContinuousConversation {
  private config: ContinuousModeConfig;
  private active = false;
  private lastActivityTime = 0;
  private sessionStart = 0;
  private timer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<ContinuousModeConfig>) {
    this.config = {
      silenceTimeout: config?.silenceTimeout ?? 5000,
      maxDuration: config?.maxDuration ?? 300000,
      onSpeechStart: config?.onSpeechStart,
      onSpeechEnd: config?.onSpeechEnd,
      onTimeout: config?.onTimeout,
    };
  }

  start(): void {
    this.active = true;
    this.sessionStart = Date.now();
    this.lastActivityTime = Date.now();
    this.startSilenceTimer();
    logger.info("Continuous conversation mode started");
  }

  stop(): void {
    this.active = false;
    if (this.timer) clearTimeout(this.timer);
    logger.info("Continuous conversation mode stopped");
  }

  isActive(): boolean { return this.active; }

  onSpeechDetected(transcript: string): void {
    if (!this.active) return;
    this.lastActivityTime = Date.now();
    this.config.onSpeechEnd?.(transcript);
    this.startSilenceTimer();
  }

  private startSilenceTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (Date.now() - this.sessionStart > this.config.maxDuration) { this.stop(); this.config.onTimeout?.(); return; }
      if (Date.now() - this.lastActivityTime >= this.config.silenceTimeout) { this.config.onTimeout?.(); }
    }, this.config.silenceTimeout);
  }

  getSessionDuration(): number { return Date.now() - this.sessionStart; }
}
