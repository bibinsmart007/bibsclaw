import semver from 'semver';

export interface PluginVersion {
  name: string;
  version: string;
  minAppVersion: string;
  changelog: string;
}

export class PluginVersionManager {
  private registry = new Map<string, PluginVersion[]>();
  addVersion(plugin: PluginVersion): void {
    const versions = this.registry.get(plugin.name) || [];
    versions.push(plugin);
    this.registry.set(plugin.name, versions);
  }
  getLatest(name: string): PluginVersion | null {
    const v = this.registry.get(name);
    if (!v || v.length === 0) return null;
    return v.sort((a, b) => semver.compare(b.version, a.version))[0];
  }
  checkUpdate(name: string, current: string): PluginVersion | null {
    const latest = this.getLatest(name);
    if (!latest) return null;
    return semver.gt(latest.version, current) ? latest : null;
  }
}

export const versionManager = new PluginVersionManager();
