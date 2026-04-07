# BibsClaw 🦾

**Your personal AI assistant with voice, code, and autonomy — built by Bibin.**

BibsClaw is a TypeScript-powered AI agent that lives on your server and works across Telegram, your browser dashboard, and the CLI. It combines real-time web search, voice I/O, an autonomous coding agent, and a task scheduler — all in one self-hosted package.

---

## ✨ What makes BibsClaw different

- **Real-time knowledge** — Perplexity-powered conversations with live web search, so answers are never stale.
- **Autonomous coding agent** — Claude reads, writes, runs, and fixes your code. Always branches off `main`. Never breaks your repo.
- **Voice-first** — Whisper handles speech-to-text, ElevenLabs handles text-to-speech. Talk to it, hear it talk back.
- **Lives everywhere** — Telegram bot, web dashboard, or terminal REPL — one agent, three interfaces.
- **Task automation** — Schedule recurring jobs (posts, builds, deploys) in plain language. Runs unattended.
- **Guardrails built in** — Blocked paths, command allowlists, file size limits, and test requirements keep it safe.

---

## ⚡ Quick Start

```bash
# Clone the repo
git clone https://github.com/bibinsmart007/bibsclaw.git
cd bibsclaw

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env — at minimum, set PERPLEXITY_API_KEY or ANTHROPIC_API_KEY

# Build and run
npm run build
npm start

# Or run in dev mode (hot reload)
npm run dev
```

Then open **http://localhost:3200** for the web dashboard, or message your Telegram bot.

---

## 🔑 Configuration

Copy `.env.example` to `.env` and fill in your keys:

| Variable | Required | Description |
|---|---|---|
| `PERPLEXITY_API_KEY` | Yes* | Perplexity API — real-time web search AI |
| `ANTHROPIC_API_KEY` | Yes* | Anthropic Claude — coding agent + fallback |
| `TELEGRAM_BOT_TOKEN` | No | Telegram bot token from [@BotFather](https://t.me/BotFather) |
| `OPENAI_API_KEY` | No | Whisper speech-to-text |
| `ELEVENLABS_API_KEY` | No | ElevenLabs text-to-speech |
| `TELEGRAM_ALLOWED_USERS` | No | Comma-separated Telegram user IDs (restricts access) |

*At least one AI provider key is required.*

---

## 🧠 Features

### Perplexity AI Chat
BibsClaw uses Perplexity's API to answer questions with live web search baked in. No stale training data — it knows what happened today.

### Autonomous Coding Agent
The coding agent (powered by Claude) can:
- Read and understand your codebase
- Write new features and fix bugs
- Run tests and verify output
- Always branch off `main` — never directly edits your primary branch
- Respect blocked paths and command allowlists you configure

### Voice Interface
Talk to BibsClaw with your microphone. It transcribes via **OpenAI Whisper** and responds in natural speech via **ElevenLabs TTS**. Available in the web dashboard.

### Telegram Bot
Access BibsClaw from anywhere:
1. Message [@BotFather](https://t.me/BotFather) and create a new bot with `/newbot`
2. Copy the token to `TELEGRAM_BOT_TOKEN` in `.env`
3. Optionally set `TELEGRAM_ALLOWED_USERS` to whitelist your Telegram user ID
4. Start BibsClaw and message your bot

### Web Dashboard
Open `http://localhost:3200` for a full real-time interface built on Express + Socket.IO:
- Live chat with AI
- Voice input/output
- Task scheduler management
- Tool activity log

### CLI REPL
Run `npm start` for an interactive terminal with colored output and slash commands. Great for local development and quick tasks.

### Task Automation
Schedule recurring tasks in plain language — social media posts, nightly builds, deployments. BibsClaw's scheduler runs them unattended and reports results.

---

## 🏗️ Architecture

```
bibsclaw/
├── src/
│   ├── agent/          # AI agent core (Perplexity + Anthropic with tool use)
│   ├── telegram/       # Telegram bot integration (grammy)
│   ├── voice/          # Speech-to-text (Whisper) + text-to-speech (ElevenLabs)
│   ├── automation/     # Task scheduler (cron-style recurring jobs)
│   ├── web/            # Express dashboard + Socket.IO real-time UI
│   ├── config.ts       # Environment configuration
│   └── index.ts        # Main entry point
```

---

## 🛡️ Safety and Guardrails

BibsClaw's coding agent operates under strict rules to prevent accidental damage:

- **Blocked paths** — Configure directories the agent is never allowed to touch
- **Command allowlist** — Only pre-approved shell commands can be run autonomously
- **File size limits** — Prevents runaway writes
- **Test requirements** — Agent must run and pass tests before committing changes
- **Branch isolation** — All code changes happen on feature branches; `main` is never directly modified

---

## 🗺️ Roadmap

- Memory system — persistent user context across sessions
- Multi-model support — switch between Perplexity, Claude, GPT-4o, and local models
- Discord and Slack gateway
- Subagent spawning for parallel workstreams
- Skills system — reusable agent procedures you can build and share
- MCP server integration

---

## 🤝 Contributing

PRs and issues are welcome! To get started:

```bash
git clone https://github.com/bibinsmart007/bibsclaw.git
cd bibsclaw
npm install
npm run dev
```

Please open an issue before working on large features so we can align on direction.

---

## 📄 License

MIT — see [LICENSE](LICENSE).

Built with ☕ by [Bibin](https://github.com/bibinsmart007).
