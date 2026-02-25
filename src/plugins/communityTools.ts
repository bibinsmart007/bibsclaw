import { container } from '../di/container';

export interface CommunityPlugin {
  name: string;
  version: string;
  author: string;
  description: string;
  execute: (input: unknown) => Promise<unknown>;
}

class CommunityToolRegistry {
  private plugins = new Map<string, CommunityPlugin>();
  register(plugin: CommunityPlugin): void {
    this.plugins.set(plugin.name, plugin);
  }
  get(name: string): CommunityPlugin | undefined {
    return this.plugins.get(name);
  }
  list(): CommunityPlugin[] {
    return Array.from(this.plugins.values());
  }
}

export const communityTools = new CommunityToolRegistry();
