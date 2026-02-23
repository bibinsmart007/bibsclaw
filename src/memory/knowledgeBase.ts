import { logger } from "../middleware/logger.js";
import fs from "node:fs";
import path from "node:path";

export interface CodeEntity { type: "function" | "class" | "interface" | "export" | "import"; name: string; file: string; line: number; signature: string; }

export function analyzeCodebase(rootDir: string): CodeEntity[] {
  const entities: CodeEntity[] = [];
  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && !["node_modules", "dist", ".git", ".bibsclaw"].includes(entry.name)) walk(path.join(dir, entry.name));
      else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".js"))) {
        const filePath = path.join(dir, entry.name);
        const lines = fs.readFileSync(filePath, "utf-8").split("\n");
        lines.forEach((line, i) => {
          const trimmed = line.trim();
          if (trimmed.match(/^export\s+(async\s+)?function\s+/)) entities.push({ type: "function", name: trimmed.match(/function\s+(\w+)/)?.[1] || "", file: filePath, line: i + 1, signature: trimmed.slice(0, 120) });
          if (trimmed.match(/^export\s+(abstract\s+)?class\s+/)) entities.push({ type: "class", name: trimmed.match(/class\s+(\w+)/)?.[1] || "", file: filePath, line: i + 1, signature: trimmed.slice(0, 120) });
          if (trimmed.match(/^export\s+(interface|type)\s+/)) entities.push({ type: "interface", name: trimmed.match(/(interface|type)\s+(\w+)/)?.[2] || "", file: filePath, line: i + 1, signature: trimmed.slice(0, 120) });
        });
      }
    }
  }
  walk(rootDir);
  logger.info(`Knowledge base: analyzed ${entities.length} entities`);
  return entities;
}

export function searchEntities(entities: CodeEntity[], query: string): CodeEntity[] {
  const lower = query.toLowerCase();
  return entities.filter((e) => e.name.toLowerCase().includes(lower) || e.signature.toLowerCase().includes(lower)).slice(0, 20);
}

export function formatEntities(entities: CodeEntity[]): string {
  return entities.map((e) => `[${e.type}] ${e.name} (${e.file}:${e.line})`).join("\n");
}
