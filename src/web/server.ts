import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appConfig } from "../config.js";
import { RateLimiter } from "../middleware/rateLimiter.js";
import { logger } from "../middleware/logger.js";
import { AuthManager } from "../auth/auth.js";
import { Database } from "../database/db.js";
import { BibsClawAgent } from "../agent/agent.js";
import { SpeechToText } from "../voice/stt.js";
import { TextToSpeech } from "../voice/tts.js";
import { TaskScheduler } from "../automation/scheduler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createDashboardServer(
  db: Database,
  auth: AuthManager,
  agent: BibsClawAgent,
  stt: SpeechToText,
  tts: TextToSpeech,
  scheduler: TaskScheduler
) {
  const app = express();
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*" },
  });

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
  });

  // Rate limiting
  const rateLimiter = new RateLimiter(60 * 1000, 100);
  app.use(rateLimiter.middleware());

  const log = logger.child("server");
  app.use(express.static(path.join(__dirname, "public")));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      version: "2.0.0",
      aiProvider: appConfig.ai.provider,
      sttEnabled: stt.enabled,
      ttsEnabled: tts.enabled,
      telegramEnabled: appConfig.telegram.enabled,
      agentBusy: agent.busy,
    });
  });

  // Chat endpoint
  app.post("/api/chat", async (req, res): Promise<void> => {
    try {
      const { message } = req.body;
      if (!message) {
        res.status(400).json({ error: "Message is required" });
        return;
      }
      const response = await agent.chat(message);
      res.json({ response });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Voice transcribe endpoint
  app.post("/api/voice/transcribe", async (req, res): Promise<void> => {
    try {
      if (!stt.enabled) {
        res.status(400).json({ error: "STT not configured" });
        return;
      }
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", async () => {
        const audioBuffer = Buffer.concat(chunks);
        const text = await stt.transcribeBuffer(audioBuffer);
        res.json({ text });
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Voice synthesize endpoint
  app.post("/api/voice/speak", async (req, res): Promise<void> => {
    try {
      if (!tts.enabled) {
        res.status(400).json({ error: "TTS not configured" });
        return;
      }
      const { text } = req.body;
      const audioBase64 = await tts.synthesizeToBase64(text);
      res.json({ audio: audioBase64 });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Task scheduler endpoints
  app.get("/api/tasks", (_req, res) => {
    res.json(scheduler.listTasks());
  });

  app.post("/api/tasks", (req, res) => {
    const { name, description, cronExpression, action } = req.body;
    const task = scheduler.addTask(name, description, cronExpression, action);
    res.json(task);
  });

  app.delete("/api/tasks/:id", (req, res) => {
    const removed = scheduler.removeTask(req.params.id);
    res.json({ removed });
  });

  app.patch("/api/tasks/:id/toggle", (req, res) => {
    const toggled = scheduler.toggleTask(req.params.id);
    res.json({ toggled });
  });

  // Conversation history
  app.get("/api/history", (_req, res) => {
    res.json(agent.getHistory());
  });

  app.post("/api/history/clear", (_req, res) => {
    agent.clearHistory();
    res.json({ cleared: true });
  });

  // Authentication endpoints
  app.post("/api/auth/login", (req, res): void => {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password required" });
      return;
    }
    const user = auth.validateCredentials(username, password);
    if (!user) {
      log.warn("Failed login attempt", { username });
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const session = auth.createSession(user);
    log.info("User logged in", { username });
    res.json({ token: session.token, user: session.user, expiresAt: session.expiresAt });
  });

  app.post("/api/auth/logout", (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) auth.revokeToken(token);
    res.json({ success: true });
  });

  // Chat history from database
  app.get("/api/history/db", (_req, res) => {
    res.json(db.getChatHistory());
  });

  // Task logs
  app.get("/api/tasks/logs", (_req, res) => {
    res.json(db.getTaskLogs());
  });

  // Socket.IO for real-time updates
  io.on("connection", (socket) => {
    log.info("Dashboard client connected");

    // Send connection confirmation
    socket.emit("connected", { status: "ok", provider: appConfig.ai.provider });

    socket.on("chat", async (message: string) => {
      socket.emit("thinking", true);
      try {
        const response = await agent.chat(message);
        socket.emit("response", response);
        // Persist to database
        db.addChatMessage("user", message, appConfig.ai.provider).catch(() => {});
        db.addChatMessage("assistant", response, appConfig.ai.provider).catch(() => {});
        // Send TTS audio if enabled
        if (tts.enabled) {
          try {
            const audioBase64 = await tts.synthesizeToBase64(response);
            socket.emit("tts_audio", audioBase64);
          } catch (ttsErr) {
            console.warn("TTS synthesis failed:", ttsErr);
          }
        }
      } catch (err) {
        socket.emit("error", String(err));
      }
      socket.emit("thinking", false);
    });

    socket.on("disconnect", () => {
      log.info("Dashboard client disconnected");
    });
  });

  // Forward agent events to Socket.IO
  agent.on("thinking", (text) => io.emit("agentThinking", text));
  agent.on("toolCall", (name, input) =>
    io.emit("toolCall", { name, input })
  );
  agent.on("toolResult", (name, result) =>
    io.emit("toolResult", { name, result })
  );
  agent.on("message", (msg) => io.emit("message", msg));
  agent.on("error", (err) => io.emit("error", err.message));

  // Forward scheduler events
  scheduler.on("taskRun", (task) => io.emit("taskRun", task));
  scheduler.on("taskAdded", (task) => io.emit("taskAdded", task));

  return { app, httpServer, io };
}
