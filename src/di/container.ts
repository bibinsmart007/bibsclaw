import { EventEmitter } from 'events';
class DIContainer {
  private services: Record<string, unknown> = {};
  private factories = new Map<string, () => unknown>();
  register<T>(name: string, factory: () => T): void {
    this.factories.set(name, factory);
  }
  singleton<T>(name: string, factory: () => T): void {
    this.register(name, () => {
      if (!this.services[name]) this.services[name] = factory();
      return this.services[name] as T;
    });
  }
  resolve<T>(name: string): T {
    const f = this.factories.get(name);
    if (!f) throw new Error(`Service ${name} not found`);
    return f() as T;
  }
  reset(): void { this.services = {}; this.factories.clear(); }
}
export const container = new DIContainer();
