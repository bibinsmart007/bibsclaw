import chalk from "chalk";
import readline from "node:readline";
import { appConfig } from "./config.js";
import { BibsClawAgent } from "./agent/agent.js";
import { SpeechToText } from "./voice/stt.js";
import { TextToSpeech } from "./voice/tts.js";
import { TaskScheduler } from "./automation/scheduler.js";
import { createDashboardServer } from "./web/server.js";
import { TelegramBot } from "./telegram/bot.js";

const BANNER = `
${chalk.cyan("  ____  _ _       ____  _             ")}
${chalk.cyan(" | __ )(_) |__   / ___|| | __ ___      ")}
${chalk.cyan(" |  _ \\| | '_ \\ \\___ \\| |/ _` \\ \\ /\\ / /")}
${chalk.cyan(" | |_) | | |_) | ___) | | (_| |\\ V  V / ")}
${chalk.cyan(" |____/|_|_.__/ |____/|_|\\__,_| \\_/\\_/  ")}
${chalk.gray("  Personal AI Assistant & Automation Agent")}
${chalk.gray("  Built by Bibin | v2.0.0")}
`;

async function main() {
  console.log(BANNER);

  // Initialize components
  console.log(chalk.yellow("Initializing BibsClaw..."));

  const agent = new BibsClawAgent();
  const stt = new SpeechToText();
  const tts = new TextToSpeech();
  const scheduler = new TaskScheduler();
  const telegramBot = new TelegramBot(agent);

  // Initialize scheduler
  await scheduler.init();
  console.log(chalk.green("  Task scheduler initialized"));

  // Wire up agent events for CLI display
  agent.on("thinking", (text) => {
    process.stdout.write(chalk.gray(`\r  ${text}`));
  });

  agent.on("toolCall", (name, _input) => {
    console.log(chalk.blue(`\n  Tool: ${name}`));
  });

  agent.on("toolResult", (name, result) => {
    const status = result.success ? chalk.green("OK") : chalk.red("FAIL");
    console.log(chalk.blue(`    ${name}: ${status}`));
  });

  agent.on("error", (err) => {
    console.error(chalk.red(`\n  Error: ${err.message}`));
  });

  // Wire up scheduler events
  scheduler.on("taskRun", (task) => {
    console.log(chalk.magenta(`\n  Scheduled task ran: ${task.name}`));
    agent.chat(task.action).catch(console.error);
  });

  // Start Telegram bot
  if (telegramBot.enabled) {
    await telegramBot.start();
    console.log(chalk.green("  Telegram bot started"));
  } else {
    console.log(chalk.gray("  Telegram bot: disabled (no token)"));
  }

  // Start dashboard server
  if (appConfig.web.dashboardEnabled) {
    const { httpServer } = createDashboardServer(agent, stt, tts, scheduler);
    httpServer.listen(appConfig.web.port, "0.0.0.0", () => {
      console.log(
        chalk.green(`  Dashboard: http://0.0.0.0:${appConfig.web.port}`)
      );
    });
  }

  // Status summary
  console.log(chalk.yellow("\nStatus:"));
  console.log(`  AI Provider: ${chalk.white(appConfig.ai.provider)}`);
  if (appConfig.ai.provider === "perplexity") {
    console.log(`  Perplexity Model: ${chalk.white(appConfig.ai.perplexityModel)}`);
  } else {
    console.log(`  Anthropic Model: ${chalk.white(appConfig.ai.anthropicModel)}`);
  }
  console.log(
    `  Voice STT: ${
      stt.enabled ? chalk.green("enabled") : chalk.gray("disabled")
    }`
  );
  console.log(
    `  Voice TTS: ${
      tts.enabled ? chalk.green("enabled") : chalk.gray("disabled")
    }`
  );
  console.log(
    `  Telegram: ${
      telegramBot.enabled ? chalk.green("enabled") : chalk.gray("disabled")
    }`
  );
  console.log(`  Project: ${chalk.white(appConfig.project.dir)}`);
  console.log(
    `  Tasks: ${chalk.white(String(scheduler.listTasks().length))} scheduled`
  );

  // Only start interactive CLI if running in a terminal (TTY)
  // In production (Railway/Docker), skip readline to prevent process.exit on stdin close
  if (process.stdin.isTTY) {
    console.log(
      chalk.gray("\nType a message to chat, or 'quit' to exit.\n")
    );

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan("bibs> "),
    });

    rl.prompt();

    rl.on("line", async (line) => {
      const input = line.trim();
      if (!input) {
        rl.prompt();
        return;
      }

      if (input === "quit" || input === "exit") {
        console.log(chalk.yellow("\nShutting down BibsClaw..."));
        scheduler.stopAll();
        await telegramBot.stop();
        rl.close();
        process.exit(0);
      }

      if (input === "/tasks") {
        const tasks = scheduler.listTasks();
        if (tasks.length === 0) {
          console.log(chalk.gray("  No scheduled tasks."));
        } else {
          for (const task of tasks) {
            const status = task.enabled
              ? chalk.green("active")
              : chalk.gray("paused");
            console.log(
              `    ${status} ${task.name} (${task.cronExpression}) - ran ${task.runCount}x`
            );
          }
        }
        rl.prompt();
        return;
      }

      if (input === "/clear") {
        agent.clearHistory();
        console.log(chalk.gray("  Conversation cleared."));
        rl.prompt();
        return;
      }

      if (input === "/help") {
        console.log(chalk.yellow("  Commands:"));
        console.log("    /tasks  - List scheduled tasks");
        console.log("    /clear  - Clear conversation history");
        console.log("    /help   - Show this help");
        console.log("    quit    - Exit BibsClaw");
        console.log("    (anything else is sent to the AI agent)");
        rl.prompt();
        return;
      }

      // Send to agent
      const response = await agent.chat(input);
      console.log(chalk.white(`\n${response}\n`));
      rl.prompt();
    });

    rl.on("close", () => {
      scheduler.stopAll();
      process.exit(0);
    });
  } else {
    // Running in production (no TTY) - just keep the server running
    console.log(chalk.green("\nRunning in server mode (no TTY detected)."));
    console.log(chalk.green("Dashboard and API endpoints are active.\n"));

    // Handle graceful shutdown
    process.on("SIGTERM", async () => {
      console.log(chalk.yellow("Received SIGTERM, shutting down..."));
      scheduler.stopAll();
      await telegramBot.stop();
      process.exit(0);
    });

    process.on("SIGINT", async () => {
      console.log(chalk.yellow("Received SIGINT, shutting down..."));
      scheduler.stopAll();
      await telegramBot.stop();
      process.exit(0);
    });
  }
}

main().catch((err) => {
  console.error(chalk.red("Fatal error:"), err);
  process.exit(1);
});
