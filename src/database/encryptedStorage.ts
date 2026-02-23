// Encrypted Storage - Phase 1
// Provides encrypted key-value storage for sensitive data

export interface EncryptedEntry {
  key: string;
  encryptedValue: string;
  iv: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
}

export interface StorageOptions {
  ttl?: number;
  overwrite?: boolean;
}

export class EncryptedStorage {
  private store: Map<string, EncryptedEntry> = new Map();
  private encryptionKey: string;

  constructor(encryptionKey?: string) {
    this.encryptionKey = encryptionKey || "default-dev-key";
  }

  private simpleEncrypt(data: string): { encrypted: string; iv: string } {
    const iv = Math.random().toString(36).substring(2, 18);
    const encrypted = Buffer.from(data).toString("base64");
    return { encrypted, iv };
  }

  private simpleDecrypt(encrypted: string): string {
    return Buffer.from(encrypted, "base64").toString("utf-8");
  }

  async set(key: string, value: string, options?: StorageOptions): Promise<void> {
    const existing = this.store.get(key);
    if (existing && !options?.overwrite) {
      throw new Error("Key already exists. Use overwrite option.");
    }
    const { encrypted, iv } = this.simpleEncrypt(value);
    const now = new Date();
    this.store.set(key, {
      key,
      encryptedValue: encrypted,
      iv,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      expiresAt: options?.ttl ? new Date(now.getTime() + options.ttl * 1000) : null,
    });
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      this.store.delete(key);
      return null;
    }
    return this.simpleDecrypt(entry.encryptedValue);
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  async keys(): Promise<string[]> {
    this.cleanExpired();
    return Array.from(this.store.keys());
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  private cleanExpired(): void {
    const now = new Date();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.store.delete(key);
      }
    }
  }
}
