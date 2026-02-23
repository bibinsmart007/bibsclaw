import { logger } from "../middleware/logger.js";

export interface ChainStep { tool: string; input: any; transform?: (result: any) => any; }
export interface ChainResult { steps: Array<{ tool: string; input: any; output: any; duration: number }>; finalOutput: any; totalDuration: number; }

export async function executeChain(
  steps: ChainStep[],
  toolExecutor: (tool: string, input: any) => Promise<any>
): Promise<ChainResult> {
  logger.info(`Executing tool chain with ${steps.length} steps`);
  const results: ChainResult["steps"] = [];
  let lastOutput: any = null;
  const startTime = Date.now();
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const input = typeof step.input === "function" ? step.input(lastOutput) : (step.input ?? lastOutput);
    const stepStart = Date.now();
    logger.info(`Chain step ${i + 1}/${steps.length}: ${step.tool}`);
    try {
      let output = await toolExecutor(step.tool, input);
      if (step.transform) output = step.transform(output);
      results.push({ tool: step.tool, input, output, duration: Date.now() - stepStart });
      lastOutput = output;
    } catch (err: any) {
      logger.error(`Chain failed at step ${i + 1}: ${err.message}`);
      results.push({ tool: step.tool, input, output: { error: err.message }, duration: Date.now() - stepStart });
      throw err;
    }
  }
  return { steps: results, finalOutput: lastOutput, totalDuration: Date.now() - startTime };
}

export function createChain(...steps: ChainStep[]): ChainStep[] { return steps; }
