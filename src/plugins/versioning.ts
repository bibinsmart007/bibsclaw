export interface PluginVersion {
  name: string;
  version: string;
  minAppVersion: string;
  changelog: string;
}
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}
export class PluginVersionManager {
  private registry = new Map<string, PluginVersion[]>();
  addVersion(p: PluginVersion): void {
    const v = this.registry.get(p.name) || [];
    v.push(p); this.registry.set(p.name, v);
  }
  getLatest(name: string): PluginVersion | null {
    const v = this.registry.get(name);
    if (!v?.length) return null;
    return v.sort((a, b) => compareVersions(b.version, a.version))[0];
  }
  checkUpdate(name: string, cur: string): PluginVersion | null {
    const l = this.getLatest(name);
    return l && compareVersions(l.version, cur) > 0 ? l : null;
  }
}
export const versionManager = new PluginVersionManager();
