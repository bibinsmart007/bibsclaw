import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

interface ApiKeyRecord {
  key: string;
  label: string;
  createdAt: number;
  expiresAt: number;
  active: boolean;
}

export class ApiKeyRotation {
  private keys: ApiKeyRecord[] = [];
  private readonly storePath: string;
  private readonly defaultTTL = 90 * 24 * 60 * 60 * 1000;

  constructor(storePath = ".bibsclaw/api-keys.json") {
    this.storePath = storePath;
    this.load();
  }

  generate(label: string, ttlMs?: number): string {
    const key = "bsc_" + crypto.randomBytes(32).toString("hex");
    const now = Date.now();
    this.keys.push({
      key, label,
      createdAt: now,
      expiresAt: now + (ttlMs || this.defaultTTL),
      active: true,
    });
    this.save();
    return key;
  }

  validate(key: string): boolean {
    const record = this.keys.find((k) => k.key === key && k.active);
    if (!record) return false;
    if (Date.now() > record.expiresAt) {
      record.active = false;
      this.save();
      return false;
    }
    return true;
  }

  rotate(oldKey: string): string | null {
    const record = this.keys.find((k) => k.key === oldKey);
    if (!record) return null;
    record.active = false;
    const newKey = this.generate(record.label);
    this.save();
    return newKey;
  }

  revoke(key: string): boolean {
    const record = this.keys.find((k) => k.key === key);
    if (!record) return false;
    record.active = false;
    this.save();
    return true;
  }

  listActive(): Array<{ label: string; createdAt: number; expiresAt: number }> {
    return this.keys
      .filter((k) => k.active && Date.now() < k.expiresAt)
      .map(({ label, createdAt, expiresAt }) => ({ label, createdAt, expiresAt }));
  }

  cleanup(): number {
    const before = this.keys.length;
    this.keys = this.keys.filter((k) => k.active && Date.now() < k.expiresAt);
    this.save();
    return before - this.keys.length;
  }

  private save(): void {
    const dir = path.dirname(this.storePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.storePath, JSON.stringify(this.keys, null, 2), "utf-8");
  }

  private load(): void {
    if (fs.existsSync(this.storePath)) {
      try { this.keys = JSON.parse(fs.readFileSync(this.storePath, "utf-8")); } catch { this.keys = []; }
    }
  }
}
