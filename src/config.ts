import { config as dotenvConfig } from "dotenv";
import { z } from "zod";
import path from "node:path";

dotenvConfig();

const envSchema = z.object({
  // AI Provider (Anthropic for tool-use agent)
  ANTHROPIC_API_KEY: z.string().default(""),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-20250514"),

  // Perplexity API (for conversational AI + web search)
  PERPLEXITY_API_KEY: z.string().default(""),
  PERPLEXITY_MODEL: z.string().default("sonar"),

  // Telegram Bot
  TELEGRAM_BOT_TOKEN: z.string().default(""),
  TELEGRAM_ALLOWED_USERS: z.string().default(""),

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

  // Authentication
  AUTH_ENABLED: z.string().default("false"),
  AUTH_ADMIN_USER: z.string().default("admin"),
  AUTH_ADMIN_PASSWORD: z.string().default(""),

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

  // Determine which AI provider to use
  const hasPerplexity = env.PERPLEXITY_API_KEY.length > 0;
  const hasAnthropic = env.ANTHROPIC_API_KEY.length > 0;

  if (!hasPerplexity && !hasAnthropic) {
    console.error("ERROR: You must set at least PERPLEXITY_API_KEY or ANTHROPIC_API_KEY in .env");
    process.exit(1);
  }

  return {
    ai: {
      provider: hasPerplexity ? "perplexity" as const : "anthropic" as const,
      perplexityApiKey: env.PERPLEXITY_API_KEY,
      perplexityModel: env.PERPLEXITY_MODEL,
      anthropicApiKey: env.ANTHROPIC_API_KEY,
      anthropicModel: env.ANTHROPIC_MODEL,
    },
    telegram: {
      botToken: env.TELEGRAM_BOT_TOKEN,
      enabled: env.TELEGRAM_BOT_TOKEN.length > 0,
      allowedUsers: env.TELEGRAM_ALLOWED_USERS
        ? env.TELEGRAM_ALLOWED_USERS.split(",").map((u) => u.trim())
        : [],
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
    auth: {
      enabled: env.AUTH_ENABLED === "true" && env.AUTH_ADMIN_PASSWORD.length > 0,
      adminUser: env.AUTH_ADMIN_USER,
      adminPassword: env.AUTH_ADMIN_PASSWORD,
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
