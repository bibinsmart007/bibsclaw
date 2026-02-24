// Voice Mobile Interface - Phase 4.3
// Voice-first mobile interface for BibsClaw

export interface VoiceCommand {
  id: string;
  phrase: string;
  action: string;
  confidence: number;
  timestamp: Date;
}

export interface VoiceSession {
  sessionId: string;
  language: string;
  isListening: boolean;
  commands: VoiceCommand[];
  startedAt: Date;
}

export class MobileVoiceInterface {
  private session: VoiceSession | null = null;
  private supportedLanguages: string[] = ["en", "ar", "hi", "ml"];
  private commandHandlers: Map<string, (cmd: VoiceCommand) => void> = new Map();

  startSession(language: string = "en"): VoiceSession {
    this.session = {
      sessionId: `voice-${Date.now()}`,
      language: this.supportedLanguages.includes(language) ? language : "en",
      isListening: true,
      commands: [],
      startedAt: new Date(),
    };
    return this.session;
  }

  processVoiceInput(transcript: string, confidence: number = 0.9): VoiceCommand | null {
    if (!this.session || !this.session.isListening) return null;
    const command: VoiceCommand = {
      id: `cmd-${Date.now()}`,
      phrase: transcript,
      action: this.matchAction(transcript),
      confidence,
      timestamp: new Date(),
    };
    this.session.commands.push(command);
    const handler = this.commandHandlers.get(command.action);
    if (handler) handler(command);
    return command;
  }

  registerCommand(action: string, handler: (cmd: VoiceCommand) => void): void {
    this.commandHandlers.set(action, handler);
  }

  stopSession(): void {
    if (this.session) this.session.isListening = false;
  }

  getSession(): VoiceSession | null { return this.session; }
  getSupportedLanguages(): string[] { return [...this.supportedLanguages]; }

  private matchAction(transcript: string): string {
    const lower = transcript.toLowerCase();
    if (lower.includes("deploy")) return "deploy";
    if (lower.includes("status")) return "check-status";
    if (lower.includes("test")) return "run-tests";
    if (lower.includes("help")) return "show-help";
    return "chat";
  }
}
