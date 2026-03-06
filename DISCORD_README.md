## Discord Bot Integration

BibsClaw includes a Discord bot that powers the **AISocialGrowth** community server with SEO tools, site audits, and automated daily tips.

### Features

| Feature | Description |
|---------|-------------|
| `/seo-tip` | Random actionable SEO tip from a curated pool |
| `/audit-site <url>` | Quick Performance + SEO + Accessibility audit via PageSpeed Insights |
| `/blog-latest` | Link to the latest AISocialGrowth blog post |
| `/help` | Full command reference and useful links |
| **Welcome message** | Rich embed greeting new members with onboarding links |
| **Auto-role** | Automatically assigns a configured role to new members |
| **Daily SEO tip** | Posts a tip to `#seo-tips` at 9 AM UTC via node-cron |

### Setup

1. **Create a Discord Application**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Click **New Application** → name it `AISocialGrowth Bot`
   - Go to **Bot** → click **Add Bot**
   - Enable these **Privileged Gateway Intents**: `SERVER MEMBERS INTENT`, `MESSAGE CONTENT INTENT`
   - Copy the **Bot Token**

2. **Invite the Bot to Your Server**
   - Go to **OAuth2 → URL Generator**
   - Scopes: `bot`, `applications.commands`
   - Permissions: `Send Messages`, `Embed Links`, `Manage Roles`, `Read Message History`, `Use Slash Commands`
   - Open the generated URL and add the bot to your server

3. **Create Discord Channels**
   ```
   #welcome
   #announcements
   #seo-tips
   #blog-updates
   #feature-requests
   #showcase-results
   #support
   ```

4. **Get Channel & Role IDs**
   - Enable Developer Mode in Discord (Settings → App Settings → Advanced → Developer Mode)
   - Right-click each channel → **Copy Channel ID**
   - Right-click the auto-assign role → **Copy Role ID**

5. **Configure Environment Variables**

   Add the following to your `.env`:

   ```env
   # Discord Bot
   DISCORD_BOT_TOKEN=your_bot_token_here
   DISCORD_CLIENT_ID=your_application_client_id
   DISCORD_GUILD_ID=your_server_id

   # Channel IDs
   DISCORD_CHANNEL_WELCOME=000000000000000000
   DISCORD_CHANNEL_ANNOUNCEMENTS=000000000000000000
   DISCORD_CHANNEL_SEO_TIPS=000000000000000000
   DISCORD_CHANNEL_BLOG_UPDATES=000000000000000000
   DISCORD_CHANNEL_FEATURE_REQUESTS=000000000000000000
   DISCORD_CHANNEL_SHOWCASE_RESULTS=000000000000000000
   DISCORD_CHANNEL_SUPPORT=000000000000000000

   # Auto-role (assigned to every new member)
   DISCORD_AUTO_ROLE_ID=000000000000000000

   # Scheduler (default: 9 AM UTC daily)
   DISCORD_SEO_TIP_CRON=0 9 * * *
   ```

6. **Install Dependencies & Run**
   ```bash
   npm install discord.js node-cron
   npm install -D @types/node-cron
   npm run build
   npm start
   ```

### Architecture

```
src/integrations/discord/
├── config.ts      # Env vars, channel map, role config, constants
├── index.ts       # Client setup, intents, login, lifecycle
├── commands.ts    # Slash command definitions & handlers
├── events.ts      # guildMemberAdd: welcome message + auto-role
└── scheduler.ts   # node-cron daily SEO tip posting
```

The bot starts automatically when BibsClaw launches (if `DISCORD_BOT_TOKEN` is set). Import and call `startDiscordBot()` from your main entry point:

```typescript
import { startDiscordBot } from './integrations/discord/index.js';
await startDiscordBot();
```
