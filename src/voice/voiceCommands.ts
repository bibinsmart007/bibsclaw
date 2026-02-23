export interface VoiceCommand {
  pattern: RegExp;
  action: string;
  description: string;
}

const VOICE_COMMANDS: VoiceCommand[] = [
  { pattern: /^(hey |ok )?bibs(claw)?[,.]?\s*deploy/i, action: "deploy", description: "Trigger deployment" },
  { pattern: /^(hey |ok )?bibs(claw)?[,.]?\s*check status/i, action: "status", description: "Check system status" },
  { pattern: /^(hey |ok )?bibs(claw)?[,.]?\s*run tests?/i, action: "test", description: "Run test suite" },
  { pattern: /^(hey |ok )?bibs(claw)?[,.]?\s*show tasks?/i, action: "tasks", description: "List scheduled tasks" },
  { pattern: /^(hey |ok )?bibs(claw)?[,.]?\s*clear (history|chat)/i, action: "clear", description: "Clear chat history" },
  { pattern: /^(hey |ok )?bibs(claw)?[,.]?\s*stop|shut ?down/i, action: "stop", description: "Graceful shutdown" },
  { pattern: /^(hey |ok )?bibs(claw)?[,.]?\s*build/i, action: "build", description: "Run build" },
  { pattern: /^(hey |ok )?bibs(claw)?[,.]?\s*git status/i, action: "git_status", description: "Show git status" },
];

export function matchVoiceCommand(text: string): VoiceCommand | null {
  for (const cmd of VOICE_COMMANDS) {
    if (cmd.pattern.test(text.trim())) return cmd;
  }
  return null;
}

export function listVoiceCommands(): VoiceCommand[] {
  return VOICE_COMMANDS;
}

// Multi-language support mapping
export const LANGUAGE_CODES: Record<string, string> = {
  english: "en", arabic: "ar", hindi: "hi", malayalam: "ml",
  spanish: "es", french: "fr", german: "de", japanese: "ja",
  chinese: "zh", korean: "ko", portuguese: "pt", russian: "ru",
  italian: "it", dutch: "nl", turkish: "tr", thai: "th",
};

export function getLanguageCode(language: string): string {
  return LANGUAGE_CODES[language.toLowerCase()] || language;
}
