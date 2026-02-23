import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { ToolResult } from "./tools.js";

export async function executeCode(code: string, language: string = "javascript"): Promise<ToolResult> {
  const tmpDir = os.tmpdir();
  const id = `bibsclaw-sandbox-${Date.now()}`;
  let filePath: string;
  let cmd: string;
  try {
    switch (language.toLowerCase()) {
      case "javascript":
      case "js":
        filePath = path.join(tmpDir, `${id}.mjs`);
        fs.writeFileSync(filePath, code);
        cmd = `node --experimental-vm-modules ${filePath}`;
        break;
      case "typescript":
      case "ts":
        filePath = path.join(tmpDir, `${id}.ts`);
        fs.writeFileSync(filePath, code);
        cmd = `npx tsx ${filePath}`;
        break;
      case "python":
      case "py":
        filePath = path.join(tmpDir, `${id}.py`);
        fs.writeFileSync(filePath, code);
        cmd = `python3 ${filePath}`;
        break;
      case "bash":
      case "sh":
        filePath = path.join(tmpDir, `${id}.sh`);
        fs.writeFileSync(filePath, code);
        cmd = `bash ${filePath}`;
        break;
      default:
        return { success: false, output: "", error: `Unsupported language: ${language}. Supported: javascript, typescript, python, bash` };
    }
    const output = execSync(cmd, { encoding: "utf-8", timeout: 30000, maxBuffer: 1024 * 512 });
    try { fs.unlinkSync(filePath); } catch {}
    return { success: true, output: output.slice(0, 5000) };
  } catch (err: any) {
    return { success: false, output: err.stdout?.slice(0, 2000) || "", error: (err.stderr || err.message).slice(0, 2000) };
  }
}
