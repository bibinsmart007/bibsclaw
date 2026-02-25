import { VM } from 'vm2';

export interface SandboxOptions {
  timeout?: number;
  memoryLimit?: number;
  allowedModules?: string[];
}

export class PluginSandbox {
  private vm: VM;
  constructor(opts: SandboxOptions = {}) {
    this.vm = new VM({
      timeout: opts.timeout || 5000,
      sandbox: { console: { log: () => {} } },
    });
  }
  async execute(code: string, context: Record<string, unknown> = {}): Promise<unknown> {
    Object.entries(context).forEach(([k, v]) => {
      this.vm.setGlobal(k, v);
    });
    return this.vm.run(code);
  }
}

export const createSandbox = (opts?: SandboxOptions) => new PluginSandbox(opts);
