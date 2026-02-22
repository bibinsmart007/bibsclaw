# BibsClaw

Personal AI assistant with voice interface, autonomous coding agent, task automation, and a web dashboard. Built by Bibin.

## Features

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

# Copy and configure environment
cp .env.example .env
# Edit .env with your API keys

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
| ANTHROPIC_API_KEY | Yes | Claude API key |
| OPENAI_API_KEY | No | Whisper STT (voice input) |
| ELEVENLABS_API_KEY | No | ElevenLabs TTS (voice output) |
| PROJECT_DIR | No | Project directory to manage |
| PORT | No | Dashboard port (default: 3200) |

## Architecture

```
src/
  index.ts              # Main entry point + CLI REPL
  config.ts             # Environment config with Zod validation
  agent/
    agent.ts            # Claude-powered AI agent with tool loop
    tools.ts            # Dev tools (file ops, git, shell commands)
  voice/
    stt.ts              # Speech-to-Text (OpenAI Whisper)
    tts.ts              # Text-to-Speech (ElevenLabs)
  automation/
    scheduler.ts        # Task scheduler with persistence
  web/
    server.ts           # Express + Socket.IO dashboard server
    public/
      index.html        # Web dashboard UI
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `/tasks` | List all scheduled tasks |
| `/clear` | Clear conversation history |
| `/help` | Show available commands |
| `quit` | Exit BibsClaw |
| *(anything else)* | Sent to the AI agent |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check and status |
| POST | /api/chat | Send message to agent |
| POST | /api/voice/transcribe | Transcribe audio to text |
| POST | /api/voice/speak | Convert text to speech |
| GET | /api/tasks | List scheduled tasks |
| POST | /api/tasks | Create a scheduled task |
| DELETE | /api/tasks/:id | Remove a task |
| PATCH | /api/tasks/:id/toggle | Enable/disable a task |
| GET | /api/history | Get conversation history |
| POST | /api/history/clear | Clear conversation |

## Safety & Guardrails

- Agent always works on a **feature branch** (prefix: `bibsclaw/`)
- Blocked paths: `.env`, `.env.local`, `node_modules`, `dist`, `.git`
- Only allowed shell commands can be executed
- Max file size limit (default 500KB)
- Tests must pass before committing (configurable)
- Auto-merge disabled by default

## Tech Stack

- TypeScript + Node.js 22+
- Claude (Anthropic SDK) for AI reasoning
- OpenAI Whisper for speech-to-text
- ElevenLabs for text-to-speech
- Express + Socket.IO for web dashboard
- simple-git for git operations
- Zod for config validation

## Requirements

- Node.js >= 22
- Anthropic API key (required)
- OpenAI API key (optional, for voice input)
- ElevenLabs API key (optional, for voice output)

## License

MIT
