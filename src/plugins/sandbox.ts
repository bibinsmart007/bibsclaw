import { createContext, runInNewContext } from 'vm';
export interface SandboxOptions {
  timeout?: number;
  memoryLimit?: number;
}
export class PluginSandbox {
  private timeout: number;
  constructor(opts: SandboxOptions = {}) {
    this.timeout = opts.timeout || 5000;
  }
  async execute(code: string, ctx: Record<string, unknown> = {}): Promise<unknown> {
    const sandbox = createContext({ ...ctx, console: { log: () => {} } });
    return runInNewContext(code, sandbox, { timeout: this.timeout });
  }
}
export const createSandbox = (opts?: SandboxOptions) => new PluginSandbox(opts);
