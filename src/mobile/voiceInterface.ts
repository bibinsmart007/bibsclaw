// Voice-First Mobile Interface - Phase 4.3
export interface VoiceConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  wakeWord: string;
}

export class MobileVoiceInterface {
  private config: VoiceConfig;
  private active: boolean = false;
  constructor(config?: Partial<VoiceConfig>) {
    this.config = { language: 'en-US', continuous: true, interimResults: true, wakeWord: 'Hey BibsClaw', ...config };
  }
  start(): void { this.active = true; }
  stop(): void { this.active = false; }
  isActive(): boolean { return this.active; }
  getConfig(): VoiceConfig { return { ...this.config }; }
}
