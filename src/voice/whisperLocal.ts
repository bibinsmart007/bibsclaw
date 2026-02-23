import { logger } from "../middleware/logger.js";
import { execSync, exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export interface WhisperLocalOptions { model?: string; language?: string; outputFormat?: string; }

export function isWhisperInstalled(): boolean {
  try { execSync("whisper --help", { stdio: "ignore" }); return true; } catch { return false; }
}

export async function transcribeLocal(audioPath: string, opts: WhisperLocalOptions = {}): Promise<string> {
  if (!fs.existsSync(audioPath)) throw new Error(`Audio file not found: ${audioPath}`);
  if (!isWhisperInstalled()) throw new Error("Whisper not installed. Run: pip install openai-whisper");
  const model = opts.model || "base";
  const lang = opts.language || "en";
  const outDir = path.join(process.cwd(), ".bibsclaw", "whisper_out");
  fs.mkdirSync(outDir, { recursive: true });
  logger.info(`Whisper local transcription: model=${model}, lang=${lang}`);
  return new Promise((resolve, reject) => {
    const cmd = `whisper "${audioPath}" --model ${model} --language ${lang} --output_format txt --output_dir "${outDir}"`;
    exec(cmd, { timeout: 120000 }, (err, stdout, stderr) => {
      if (err) { reject(new Error(`Whisper error: ${stderr || err.message}`)); return; }
      const baseName = path.basename(audioPath, path.extname(audioPath));
      const outFile = path.join(outDir, `${baseName}.txt`);
      if (fs.existsSync(outFile)) { resolve(fs.readFileSync(outFile, "utf-8").trim()); } else { resolve(stdout.trim()); }
    });
  });
}

export function getAvailableModels(): string[] { return ["tiny", "base", "small", "medium", "large"]; }
