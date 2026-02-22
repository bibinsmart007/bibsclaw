import { config as dotenvConfig } from "dotenv";
import { z } from "zod";
import path from "node:path";

dotenvConfig();

const envSchema = z.object({
  // AI Provider
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-20250514"),

  // Speech-to-Text
  OPENAI_API_KEY: z.string().default(""),
  STT_MODEL: z.string().default("whisper-1"),
  STT_LANGUAGE: z.string().default("en"),

  // Text-to-Speech
  ELEVENLABS_API_KEY: z.string().default(""),
  ELEVENLABS_VOICE_ID: z.string().default("21m00Tcm4TlvDq8ikWAM"),
  ELEVENLABS_MODEL: z.string().default("eleven_monolingual_v1"),

  // Web Dashboard
  PORT: z.coerce.number().default(3200),
  DASHBOARD_ENABLED: z.string().default("true"),

  // Git / Project
  PROJECT_DIR: z.string().default(process.cwd()),
  GIT_AUTO_BRANCH: z.string().default("true"),
  GIT_BRANCH_PREFIX: z.string().default("bibsclaw/"),
  ALLOWED_COMMANDS: z.string().default(
    "npm test,npm run lint,npm run build,git status,git diff,git log"
  ),

  // Guardrails
  MAX_FILE_SIZE_KB: z.coerce.number().default(500),
  BLOCKED_PATHS: z.string().default(".env,.env.local,node_modules,dist,.git"),
  AUTO_MERGE: z.string().default("false"),
  REQUIRE_TESTS_PASS: z.string().default("true"),

  // Logging
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  LOG_FILE: z.string().default("bibsclaw.log"),
});

function loadConfig() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("Invalid environment configuration:");
    for (const issue of parsed.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  const env = parsed.data;

  return {
    ai: {
      apiKey: env.ANTHROPIC_API_KEY,
      model: env.ANTHROPIC_MODEL,
    },
    stt: {
      apiKey: env.OPENAI_API_KEY,
      model: env.STT_MODEL,
      language: env.STT_LANGUAGE,
      enabled: env.OPENAI_API_KEY.length > 0,
    },
    tts: {
      apiKey: env.ELEVENLABS_API_KEY,
      voiceId: env.ELEVENLABS_VOICE_ID,
      model: env.ELEVENLABS_MODEL,
      enabled: env.ELEVENLABS_API_KEY.length > 0,
    },
    web: {
      port: env.PORT,
      dashboardEnabled: env.DASHBOARD_ENABLED === "true",
    },
    project: {
      dir: path.resolve(env.PROJECT_DIR),
      gitAutoBranch: env.GIT_AUTO_BRANCH === "true",
      gitBranchPrefix: env.GIT_BRANCH_PREFIX,
      allowedCommands: env.ALLOWED_COMMANDS.split(",").map((c) => c.trim()),
    },
    guardrails: {
      maxFileSizeKb: env.MAX_FILE_SIZE_KB,
      blockedPaths: env.BLOCKED_PATHS.split(",").map((p) => p.trim()),
      autoMerge: env.AUTO_MERGE === "true",
      requireTestsPass: env.REQUIRE_TESTS_PASS === "true",
    },
    logging: {
      level: env.LOG_LEVEL,
      file: env.LOG_FILE,
    },
  };
}

export const appConfig = loadConfig();
export type AppConfig = ReturnType<typeof loadConfig>;
