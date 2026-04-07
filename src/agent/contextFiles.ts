import fs from "node:fs";
import path from "node:path";
import { appConfig } from "../config.js";
import { logger } from "../middleware/logger.js";

// ----------------------------------------------------------------
// contextFiles.ts -- AGENTS.md / project context file system
//
// BibsClaw loads special markdown files from the project directory
// and injects their contents into every conversation system prompt,
// so the agent always has project-specific context and instructions.
//
// Supported files (loaded in priority order):
//   AGENTS.md     -- Primary context: coding standards, architecture,
//                    agent behaviour rules. Compatible with Claude Code
//                    and OpenAI Codex conventions.
//   BIBSCLAW.md   -- BibsClaw-specific persona and overrides.
//   CONTEXT.md    -- General project background.
//   CLAUDE.md     -- Claude Code-style instructions.
//   .bibsclaw/    -- All *.md files in this directory (alphabetical).
// ----------------------------------------------------------------

export interface ContextFile {
    name: string;
  path: string;
  content: string;
  sizeBytes: number;
  lastModified: Date;
}

export interface ContextLoadResult {
    files: ContextFile[];
  totalChars: number;
  errors: Array<{ file: string; error: string }>;
}

const TOP_LEVEL_FILES = ["AGENTS.md", "BIBSCLAW.md", "CONTEXT.md", "CLAUDE.md"];

const MAX_FILE_CHARS = 12_000;
const MAX_TOTAL_CHARS = 30_000;

/**
 * Load all context files from the project directory.
   */
export function loadContextFiles(projectDir?: string): ContextLoadResult {
  const dir = projectDir ?? appConfig.project.dir;
  const result: ContextLoadResult = { files: [], totalChars: 0, errors: [] };

  for (const filename of TOP_LEVEL_FILES) {
        if (result.totalChars >= MAX_TOTAL_CHARS) break;
    const filePath = path.join(dir, filename);
    if (!fs.existsSync(filePath)) continue;

    const loaded = tryLoadFile(filePath, filename, result.totalChars);
    if (loaded.file) {
      result.files.push(loaded.file);
      result.totalChars += loaded.file.content.length;
      logger.info(`[ContextFiles] Loaded ${filename} (${loaded.file.sizeBytes}b)`);
    }
    if (loaded.error) {
      result.errors.push({ file: filename, error: loaded.error });
      logger.warn(`[ContextFiles] Failed to load ${filename}: ${loaded.error}`);
                                         }
        }

          const bibsclawDir = path.join(dir, ".bibsclaw");
  if (fs.existsSync(bibsclawDir) && result.totalChars < MAX_TOTAL_CHARS) {
    try {
      const mdFiles = fs
        .readdirSync(bibsclawDir)
        .filter((e) => e.endsWith(".md"))
        .sort();

      for (const filename of mdFiles) {
        if (result.totalChars >= MAX_TOTAL_CHARS) break;
        if (TOP_LEVEL_FILES.includes(filename)) continue;

        const filePath = path.join(bibsclawDir, filename);
        const displayName = `.bibsclaw/${filename}`;
        const loaded = tryLoadFile(filePath, displayName, result.totalChars);

        if (loaded.file) {
          result.files.push(loaded.file);
          result.totalChars += loaded.file.content.length;
          logger.info(`[ContextFiles] Loaded ${displayName} (${loaded.file.sizeBytes}b)`);
}
        if (loaded.error) {
          result.errors.push({ file: displayName, error: loaded.error });
}
}
      } catch (err) {
      result.errors.push({ file: ".bibsclaw/", error: String(err) });
}
}

  if (result.files.length > 0) {
    logger.info(
            `[ContextFiles] ${result.files.length} file(s) loaded, ${result.totalChars} chars total`
    );
} else {
    logger.info(
      "[ContextFiles] No context files found. " +
        "Create AGENTS.md in your project root to add project-specific instructions."
    );
}

  return result;
}

/**
 * Build the formatted context block injected into the system prompt.
 * Returns empty string when no context files are loaded.
 */
export function buildContextBlock(loadResult: ContextLoadResult): string {
  if (loadResult.files.length === 0) return "";

  const lines = ["=== PROJECT CONTEXT (from context files) ===", ""];

  for (const file of loadResult.files) {
    lines.push(`--- ${file.name} ---`);
    lines.push(file.content.trim());
    lines.push("");
}

  lines.push("=== END PROJECT CONTEXT ===");
  return lines.join("\n");
}

/**
 * Load context files and return the formatted block in one call.
 */
export function getContextBlock(projectDir?: string): string {
  return buildContextBlock(loadContextFiles(projectDir));
}

/**
 * Return true if any context files exist in the project directory.
 */
export function hasContextFiles(projectDir?: string): boolean {
  const dir = projectDir ?? appConfig.project.dir;

  for (const filename of TOP_LEVEL_FILES) {
    if (fs.existsSync(path.join(dir, filename))) return true;
}

  const bibsclawDir = path.join(dir, ".bibsclaw");
  if (fs.existsSync(bibsclawDir)) {
    try {
      if (fs.readdirSync(bibsclawDir).some((e) => e.endsWith(".md"))) return true;
} catch { /* ignore */ }
}

  return false;
}

/**
 * List context file names without reading them.
 * Used by the /context slash command to show status.
 */
export function listContextFiles(projectDir?: string): string[] {
  const dir = projectDir ?? appConfig.project.dir;
  const found: string[] = [];

  for (const f of TOP_LEVEL_FILES) {
    if (fs.existsSync(path.join(dir, f))) found.push(f);
  }

  const bibsclawDir = path.join(dir, ".bibsclaw");
  if (fs.existsSync(bibsclawDir)) {
    try {
      for (const e of fs.readdirSync(bibsclawDir).filter((f) => f.endsWith(".md")).sort()) {
        if (!TOP_LEVEL_FILES.includes(e)) found.push(`.bibsclaw/${e}`);
}
} catch { /* ignore */ }
}

  return found;
}

// ----------------------------------------------------------------
// Internal helper
// ----------------------------------------------------------------

function tryLoadFile(
  filePath: string,
  displayName: string,
  currentTotal: number
): { file?: ContextFile; error?: string } {
  try {
    const stat = fs.statSync(filePath);
    let content = fs.readFileSync(filePath, "utf-8");

    if (content.length > MAX_FILE_CHARS) {
      logger.warn(`[ContextFiles] ${displayName} truncated to ${MAX_FILE_CHARS} chars`);
      content =
                content.slice(0, MAX_FILE_CHARS) +
        `\n\n[...truncated -- ${displayName} is too large. Reduce the file size.]`;
}

    const remaining = MAX_TOTAL_CHARS - currentTotal;
    if (content.length > remaining) {
      content =
        content.slice(0, remaining) +
        "\n\n[...truncated -- combined context limit reached.]";
}

    return {
      file: {
        name: displayName,
        path: filePath,
        content,
        sizeBytes: stat.size,
        lastModified: stat.mtime,
},
};
} catch (err) {
    return { error: String(err) };
}
}

// ----------------------------------------------------------------
// Default AGENTS.md template (used by /context init command)
// ----------------------------------------------------------------

export const DEFAULT_AGENTS_MD = `# AGENTS.md -- BibsClaw Project Context

## Project Overview
<!-- Describe what this project does in 2-3 sentences -->

## Tech Stack
<!-- e.g. TypeScript, Node.js, Express, React, PostgreSQL -->

## Architecture
<!-- Describe the main modules and how they connect -->

## Coding Standards
- Use TypeScript with strict types
- Prefer async/await over raw Promises
- Write JSDoc comments for all exported functions
- Keep functions small and focused (single responsibility)
-
