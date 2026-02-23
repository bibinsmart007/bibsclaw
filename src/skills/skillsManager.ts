import { EventEmitter } from "events";
import * as fs from "fs";
import * as path from "path";
export interface Skill { id: string; name: string; description: string; version: string; author: string; triggers: string[]; execute: (input: unknown) => Promise<unknown>; enabled: boolean; }
export interface SkillManifest { id: string; name: string; description: string; version: string; author: string; triggers: string[]; entryPoint: string; }
export class SkillsManager extends EventEmitter {
  private skills = new Map<string, Skill>();
  private skillsDir: string;
  constructor(skillsDir = "./skills") { super(); this.skillsDir = skillsDir; }
  registerSkill(skill: Skill): void { this.skills.set(skill.id, skill); this.emit("skillRegistered", { id: skill.id, name: skill.name }); }
  unregisterSkill(id: string): boolean { return this.skills.delete(id); }
  async executeSkill(id: string, input: unknown): Promise<unknown> {
    const skill = this.skills.get(id);
    if (!skill) throw new Error(`Skill not found: ${id}`);
    if (!skill.enabled) throw new Error(`Skill disabled: ${id}`);
    try {
      const result = await skill.execute(input);
      this.emit("skillExecuted", { id, input, result });
      return result;
    } catch (e) { this.emit("skillError", { id, error: e }); throw e; }
  }
  findSkillByTrigger(trigger: string): Skill | undefined {
    for (const [, skill] of this.skills) { if (skill.enabled && skill.triggers.some(t => trigger.toLowerCase().includes(t.toLowerCase()))) return skill; }
    return undefined;
  }
  async loadSkillsFromDir(): Promise<number> {
    let loaded = 0;
    if (!fs.existsSync(this.skillsDir)) return loaded;
    const dirs = fs.readdirSync(this.skillsDir).filter(d => fs.statSync(path.join(this.skillsDir, d)).isDirectory());
    for (const dir of dirs) {
      const manifestPath = path.join(this.skillsDir, dir, "manifest.json");
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest: SkillManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
          console.log(`[Skills] Loaded: ${manifest.name} v${manifest.version}`);
          loaded++;
        } catch (e) { console.error(`[Skills] Failed to load ${dir}:`, e); }
      }
    }
    return loaded;
  }
  listSkills(): Array<{ id: string; name: string; enabled: boolean; triggers: string[] }> {
    return Array.from(this.skills.entries()).map(([id, s]) => ({ id, name: s.name, enabled: s.enabled, triggers: s.triggers }));
  }
  enableSkill(id: string): void { const s = this.skills.get(id); if (s) s.enabled = true; }
  disableSkill(id: string): void { const s = this.skills.get(id); if (s) s.enabled = false; }
}
