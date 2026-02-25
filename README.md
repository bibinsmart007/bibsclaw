# BibsClaw

Personal AI assistant with Perplexity-powered conversations, Telegram bot access, voice interface, task automation, and a web dashboard. Built by Bibin.

## Features

- **Perplexity AI Integration**: Chat with real-time web search and up-to-date knowledge
- **Telegram Bot**: Access BibsClaw from anywhere via Telegram
- **Voice Interface**: Talk to BibsClaw using natural voice (Whisper STT + ElevenLabs TTS)
- **AI Coding Agent**: Claude-powered agent that reads, writes, and fixes code autonomously
- **Git Safety**: Always works on feature branches, never touches main directly
- **Task Automation**: Schedule recurring tasks (social media posts, builds, deployments)
- **Web Dashboard**: Real-time chat UI with Socket.IO, task monitoring, and tool activity log
- **CLI REPL**: Interactive terminal with colored output and slash commands
- **Guardrails**: Blocked paths, command allowlists, file size limits, test requirements

## Quick Start

```bash
# Clone the repo
git clone https://github.com/bibinsmart007/bibsclaw.git
cd bibsclaw

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys (at minimum set PERPLEXITY_API_KEY)

# Build and run
npm run build
npm start

# Or run in dev mode
npm run dev
```

## Configuration

Copy `.env.example` to `.env` and set your keys:

| Variable | Required | Description |
|----------|----------|-------------|
| `PERPLEXITY_API_KEY` | Yes* | Perplexity API key for AI chat |
| `ANTHROPIC_API_KEY` | Yes* | Anthropic API key (fallback) |
| `TELEGRAM_BOT_TOKEN` | No | Telegram bot token from @BotFather |
| `OPENAI_API_KEY` | No | For Whisper voice transcription |
| `ELEVENLABS_API_KEY` | No | For text-to-speech |

*At least one AI provider key is required.

## Architecture

```
src/
  agent/       - AI agent (Perplexity + Anthropic with tool use)
  telegram/    - Telegram bot integration (grammy)
  voice/       - Speech-to-text and text-to-speech
  automation/  - Task scheduler
  web/         - Express dashboard + Socket.IO
  config.ts    - Environment configuration
  index.ts     - Main entry point
```

## Telegram Setup

1. Message @BotFather on Telegram
2. Create a new bot with `/newbot`
3. Copy the token to `TELEGRAM_BOT_TOKEN` in `.env`
4. Optionally set `TELEGRAM_ALLOWED_USERS` to restrict access
5. Start BibsClaw and message your bot!

## Dashboard

Open `http://localhost:3200` in your browser for the web dashboard with:
- Real-time chat with AI
- Voice input/output
- Task scheduler management
- Tool activity monitoring

## License

MIT

