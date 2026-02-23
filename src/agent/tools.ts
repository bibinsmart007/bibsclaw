import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { simpleGit, type SimpleGit } from "simple-git";
import { glob } from "glob";
import { appConfig } from "../config.js";
import { fetchWebPage, searchWeb } from "./webScraper.js";
import { httpRequest } from "./httpTool.js";
import { executeCode } from "./codeSandbox.js";


export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

const git: SimpleGit = simpleGit(appConfig.project.dir);

function isPathBlocked(filePath: string): boolean {
  const normalized = path.normalize(filePath);
  return appConfig.guardrails.blockedPaths.some(
    (blocked) => normalized.startsWith(blocked) || normalized.includes(`/${blocked}/`)
  );
}

function isCommandAllowed(command: string): boolean {
  return appConfig.project.allowedCommands.some((allowed) =>
    command.startsWith(allowed)
  );
}

export async function readFile(filePath: string): Promise<ToolResult> {
  try {
    if (isPathBlocked(filePath)) {
      return { success: false, output: "", error: `Blocked path: ${filePath}` };
    }
    const fullPath = path.resolve(appConfig.project.dir, filePath);
    const content = await fs.readFile(fullPath, "utf-8");
    return { success: true, output: content };
  } catch (err) {
    return { success: false, output: "", error: String(err) };
  }
}

export async function writeFile(
  filePath: string,
  content: string
): Promise<ToolResult> {
  try {
    if (isPathBlocked(filePath)) {
      return { success: false, output: "", error: `Blocked path: ${filePath}` };
    }
    const sizeKb = Buffer.byteLength(content, "utf-8") / 1024;
    if (sizeKb > appConfig.guardrails.maxFileSizeKb) {
      return {
        success: false,
        output: "",
        error: `File too large: ${sizeKb.toFixed(1)}KB > ${appConfig.guardrails.maxFileSizeKb}KB`,
      };
    }
    const fullPath = path.resolve(appConfig.project.dir, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, "utf-8");
    return { success: true, output: `Wrote ${filePath} (${sizeKb.toFixed(1)}KB)` };
  } catch (err) {
    return { success: false, output: "", error: String(err) };
  }
}

export async function searchFiles(pattern: string): Promise<ToolResult> {
  try {
    const files = await glob(pattern, {
      cwd: appConfig.project.dir,
      ignore: ["node_modules/**", "dist/**", ".git/**"],
    });
    return { success: true, output: files.join("\n") };
  } catch (err) {
    return { success: false, output: "", error: String(err) };
  }
}

export async function runCommand(command: string): Promise<ToolResult> {
  try {
    if (!isCommandAllowed(command)) {
      return {
        success: false,
        output: "",
        error: `Command not allowed: ${command}. Allowed: ${appConfig.project.allowedCommands.join(", ")}`,
      };
    }
    const output = execSync(command, {
      cwd: appConfig.project.dir,
      encoding: "utf-8",
      timeout: 60000,
      maxBuffer: 1024 * 1024,
    });
    return { success: true, output };
  } catch (err: any) {
    return {
      success: false,
      output: err.stdout || "",
      error: err.stderr || String(err),
    };
  }
}

export async function gitStatus(): Promise<ToolResult> {
  try {
    const status = await git.status();
    const summary = [
      `Branch: ${status.current}`,
      `Modified: ${status.modified.join(", ") || "none"}`,
      `Created: ${status.created.join(", ") || "none"}`,
      `Deleted: ${status.deleted.join(", ") || "none"}`,
      `Staged: ${status.staged.join(", ") || "none"}`,
    ].join("\n");
    return { success: true, output: summary };
  } catch (err) {
    return { success: false, output: "", error: String(err) };
  }
}

export async function gitCreateBranch(name: string): Promise<ToolResult> {
  try {
    const branchName = `${appConfig.project.gitBranchPrefix}${name}`;
    await git.checkoutLocalBranch(branchName);
    return { success: true, output: `Created and switched to branch: ${branchName}` };
  } catch (err) {
    return { success: false, output: "", error: String(err) };
  }
}

export async function gitCommit(message: string): Promise<ToolResult> {
  try {
    await git.add(".");
    const result = await git.commit(message);
    return {
      success: true,
      output: `Committed: ${result.commit} - ${message}`,
    };
  } catch (err) {
    return { success: false, output: "", error: String(err) };
  }
}

export async function gitDiff(): Promise<ToolResult> {
  try {
    const diff = await git.diff();
    return { success: true, output: diff || "No changes" };
  } catch (err) {
    return { success: false, output: "", error: String(err) };
  }
}

export async function listDirectory(dirPath: string = "."): Promise<ToolResult> {
  try {
    const fullPath = path.resolve(appConfig.project.dir, dirPath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const listing = entries
      .map((e) => `${e.isDirectory() ? "[DIR]" : "[FILE]"} ${e.name}`)
      .join("\n");
    return { success: true, output: listing };
  } catch (err) {
    return { success: false, output: "", error: String(err) };
  }
}

export const toolDefinitions = [
  {
    name: "read_file",
    description: "Read the contents of a file at the given path",
    input_schema: {
      type: "object" as const,
      properties: {
        file_path: { type: "string", description: "Path to the file relative to project root" },
      },
      required: ["file_path"],
    },
  },
  {
    name: "write_file",
    description: "Write content to a file, creating directories as needed",
    input_schema: {
      type: "object" as const,
      properties: {
        file_path: { type: "string", description: "Path to the file relative to project root" },
        content: { type: "string", description: "Full file content to write" },
      },
      required: ["file_path", "content"],
    },
  },
  {
    name: "search_files",
    description: "Search for files matching a glob pattern",
    input_schema: {
      type: "object" as const,
      properties: {
        pattern: { type: "string", description: "Glob pattern like **/*.ts" },
      },
      required: ["pattern"],
    },
  },
  {
    name: "run_command",
    description: "Run an allowed shell command in the project directory",
    input_schema: {
      type: "object" as const,
      properties: {
        command: { type: "string", description: "Shell command to execute" },
      },
      required: ["command"],
    },
  },
  {
    name: "git_status",
    description: "Get current git status of the project",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "git_create_branch",
    description: "Create a new git branch and switch to it",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Branch name (prefix will be added automatically)" },
      },
      required: ["name"],
    },
  },
  {
    name: "git_commit",
    description: "Stage all changes and commit with a message",
    input_schema: {
      type: "object" as const,
      properties: {
        message: { type: "string", description: "Commit message" },
      },
      required: ["message"],
    },
  },
  {
    name: "git_diff",
    description: "Show current unstaged changes",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "list_directory",
    description: "List files and folders in a directory",
    input_schema: {
      type: "object" as const,
      properties: {
        dir_path: { type: "string", description: "Directory path relative to project root" },
      },
    },
  },
  {
    name: "fetch_webpage",
    description: "Fetch and extract text content from a URL",
    input_schema: {
      type: "object" as const,
      properties: {
        url: { type: "string", description: "URL to fetch" },
      },
      required: ["url"],
    },
  },
  {
    name: "search_web",
    description: "Search the web using DuckDuckGo and return top results",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
  },
  {
    name: "http_request",
    description: "Make an HTTP request to an external API",
    input_schema: {
      type: "object" as const,
      properties: {
        url: { type: "string", description: "Request URL" },
        method: { type: "string", description: "HTTP method (GET, POST, PUT, DELETE)" },
        headers: { type: "object", description: "Request headers" },
        body: { type: "string", description: "Request body (for POST/PUT)" },
      },
      required: ["url"],
    },
  },
  {
    name: "execute_code",
    description: "Execute code in a sandboxed environment. Supports javascript, typescript, python, bash",
    input_schema: {
      type: "object" as const,
      properties: {
        code: { type: "string", description: "Code to execute" },
        language: { type: "string", description: "Programming language (javascript, typescript, python, bash)" },
      },
      required: ["code"],
    },
  },
];

export async function executeTool(
  toolName: string,
  input: Record<string, any>
): Promise<ToolResult> {
  switch (toolName) {
    case "read_file":
      return readFile(input.file_path);
    case "write_file":
      return writeFile(input.file_path, input.content);
    case "search_files":
      return searchFiles(input.pattern);
    case "run_command":
      return runCommand(input.command);
    case "git_status":
      return gitStatus();
    case "git_create_branch":
      return gitCreateBranch(input.name);
    case "git_commit":
      return gitCommit(input.message);
    case "git_diff":
      return gitDiff();
    case "list_directory":
      return listDirectory(input.dir_path || ".");
    default:
      return { success: false, output: "", error: `Unknown tool: ${toolName}` };
  }
}
