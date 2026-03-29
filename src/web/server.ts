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
import { routeToAgent, getAgentList, getAgent } from "../agent/agentRouter.js";

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

  // ═══════════════════════════════════════════════════════════════
  // AGENT ROUTING — Each of 25 specialist agents with dedicated
  // system prompts, tools, and Anthropic agentic loop.
  // Only Bibin Lonappan can activate agents via this endpoint.
  // ═══════════════════════════════════════════════════════════════

  // Get all agent definitions for the UI
  app.get("/api/agents", (_req, res) => {
    res.json(getAgentList());
  });

  // Get a single agent definition
  app.get("/api/agents/:agentId", (req, res): void => {
    const agentDef = getAgent(req.params.agentId);
    if (!agentDef) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    res.json(agentDef);
  });

  // Route a message to a specific specialist agent
  app.post("/api/agent/:agentId", async (req, res): Promise<void> => {
    try {
      const requestedAgentId = req.params.agentId;
      const { message, history } = req.body;
      if (!message) {
        res.status(400).json({ error: "Message is required" });
        return;
      }
      const agentDef = getAgent(requestedAgentId);
      if (!agentDef) {
        res.status(404).json({ error: `Unknown agent: ${requestedAgentId}` });
        return;
      }

      // Emit agent start event to UI via Socket.IO
      io.emit("agentStart", { agentId: requestedAgentId, agentName: agentDef.name, message });

      const result = await routeToAgent(requestedAgentId, message, history || []);

      // Emit completion event with tool usage
      io.emit("agentComplete", {
        agentId: requestedAgentId,
        agentName: agentDef.name,
        toolsUsed: result.toolsUsed,
        tokensUsed: result.tokensUsed,
        model: result.model,
      });

      // Log to database
      db.addChatMessage("user", `[${agentDef.name}] ${message}`, result.model).catch(() => {});
      db.addChatMessage("assistant", result.response, result.model).catch(() => {});

      res.json({
        agentId: requestedAgentId,
        agentName: agentDef.name,
        response: result.response,
        toolsUsed: result.toolsUsed,
        tokensUsed: result.tokensUsed,
        model: result.model,
      });
    } catch (err) {
      const errorMsg = String(err);
      io.emit("agentError", { agentId: req.params.agentId, error: errorMsg });
      res.status(500).json({ error: errorMsg });
    }
  });

  // Broadcast a message to multiple agents simultaneously
  app.post("/api/agents/broadcast", async (req, res): Promise<void> => {
    try {
      const { message, agentIds } = req.body;
      if (!message || !agentIds || !Array.isArray(agentIds)) {
        res.status(400).json({ error: "message and agentIds array required" });
        return;
      }

      io.emit("broadcastStart", { agentIds, message });

      // Run all agents in parallel
      const results = await Promise.allSettled(
        agentIds.map((id: string) => routeToAgent(id, message))
      );

      const responses = results.map((r, i) => {
        const id = agentIds[i] as string;
        if (r.status === "fulfilled") {
          return {
            agentId: id,
            agentName: r.value.agentName,
            response: r.value.response,
            toolsUsed: r.value.toolsUsed,
            tokensUsed: r.value.tokensUsed,
            model: r.value.model,
          };
        }
        return {
          agentId: id,
          error: (r as PromiseRejectedResult).reason?.message ?? "Unknown error",
        };
      });

      io.emit("broadcastComplete", { responses });
      res.json({ responses });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
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
  agent.on("toolCall", (name, input) => io.emit("toolCall", { name, input }));
  agent.on("toolResult", (name, result) => io.emit("toolResult", { name, result }));
  agent.on("message", (msg) => io.emit("message", msg));
  agent.on("error", (err) => io.emit("error", err.message));

  // Forward scheduler events
  scheduler.on("taskRun", (task) => io.emit("taskRun", task));
  scheduler.on("taskAdded", (task) => io.emit("taskAdded", task));

  
  // ═══════════════════════════════════════════════════════════════
  // SERVICE CONTROL — Start / Stop the Railway deployment
  // Uses Railway REST API with RAILWAY_API_TOKEN env var
  // ═══════════════════════════════════════════════════════════════

  const RAILWAY_API_TOKEN = process.env.RAILWAY_API_TOKEN || "";
  const RAILWAY_SERVICE_ID = process.env.RAILWAY_SERVICE_ID || "ca5e3298-6356-42de-8d88-a2991e9db49b";
  const RAILWAY_ENV_ID = process.env.RAILWAY_ENV_ID || "e119f5aa-639d-4c62-8b6b-524e8e2bd40f";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function railwayGraphQL(query: string, variables: Record<string, unknown> = {}): Promise<any> {
    const res = await fetch("https://backboard.railway.com/graphql/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RAILWAY_API_TOKEN}`,
      },
      body: JSON.stringify({ query, variables }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return res.json() as any;
  }

  // GET service status
  app.get("/api/service/status", async (_req, res): Promise<void> => {
    try {
      if (!RAILWAY_API_TOKEN) {
        res.json({ running: true, note: "RAILWAY_API_TOKEN not set — assuming running" });
        return;
      }
      const data = await railwayGraphQL(`
        query {
          service(id: "${RAILWAY_SERVICE_ID}") {
            id
            name
            deployments(first: 1) {
              edges {
                node {
                  id
                  status
                }
              }
            }
          }
        }
      `);
      const deployment = data?.data?.service?.deployments?.edges?.[0]?.node;
      const status = deployment?.status || "UNKNOWN";
      res.json({ running: status === "SUCCESS" || status === "DEPLOYING", status });
    } catch (err) {
      res.json({ running: true, error: String(err) });
    }
  });

  // POST /api/service/stop — redeploy with 0 replicas (pause)
  app.post("/api/service/stop", async (_req, res): Promise<void> => {
    try {
      if (!RAILWAY_API_TOKEN) {
        res.status(400).json({ ok: false, error: "RAILWAY_API_TOKEN not configured in Railway variables" });
        return;
      }
      const data = await railwayGraphQL(`
        mutation ServiceInstanceUpdate($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) {
          serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input)
        }
      `, {
        serviceId: RAILWAY_SERVICE_ID,
        environmentId: RAILWAY_ENV_ID,
        input: { numReplicas: 0 }
      });
      if (data.errors) {
        res.json({ ok: false, error: data.errors[0]?.message || "GraphQL error" });
        return;
      }
      res.json({ ok: true, action: "stopped", note: "Service set to 0 replicas — no charges while stopped" });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // POST /api/service/start — restore to 1 replica
  app.post("/api/service/start", async (_req, res): Promise<void> => {
    try {
      if (!RAILWAY_API_TOKEN) {
        res.status(400).json({ ok: false, error: "RAILWAY_API_TOKEN not configured in Railway variables" });
        return;
      }
      const data = await railwayGraphQL(`
        mutation ServiceInstanceUpdate($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) {
          serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input)
        }
      `, {
        serviceId: RAILWAY_SERVICE_ID,
        environmentId: RAILWAY_ENV_ID,
        input: { numReplicas: 1 }
      });
      if (data.errors) {
        res.json({ ok: false, error: data.errors[0]?.message || "GraphQL error" });
        return;
      }
      res.json({ ok: true, action: "started", note: "Service restored to 1 replica" });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  return { app, httpServer, io };
}
