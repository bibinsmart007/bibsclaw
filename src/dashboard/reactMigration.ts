// React Migration - Phase 4.1
// Handles migration from vanilla HTML/JS to React + Tailwind CSS

export interface MigrationConfig {
  enableReact: boolean;
  useTailwind: boolean;
  preserveLegacy: boolean;
  componentMap: Map<string, string>;
}

export interface ComponentRegistry {
  name: string;
  path: string;
  migrated: boolean;
  dependencies: string[];
}

export class ReactMigrationManager {
  private config: MigrationConfig;
  private registry: ComponentRegistry[] = [];

  constructor(config?: Partial<MigrationConfig>) {
    this.config = {
      enableReact: true,
      useTailwind: true,
      preserveLegacy: true,
      componentMap: new Map(),
      ...config,
    };
  }

  registerComponent(component: ComponentRegistry): void {
    this.registry.push(component);
  }

  getMigrationProgress(): { total: number; migrated: number; percent: number } {
    const total = this.registry.length;
    const migrated = this.registry.filter((c) => c.migrated).length;
    return { total, migrated, percent: total > 0 ? Math.round((migrated / total) * 100) : 0 };
  }

  getUnmigratedComponents(): ComponentRegistry[] {
    return this.registry.filter((c) => !c.migrated);
  }

  markAsMigrated(name: string): boolean {
    const component = this.registry.find((c) => c.name === name);
    if (component) { component.migrated = true; return true; }
    return false;
  }
}
