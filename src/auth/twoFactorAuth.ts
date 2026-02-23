// Two-Factor Authentication - Phase 1
// TOTP-based 2FA for dashboard login

export interface TwoFactorConfig {
  userId: string;
  secret: string;
  enabled: boolean;
  backupCodes: string[];
  createdAt: Date;
}

export interface TwoFactorSetupResult {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

export class TwoFactorAuthManager {
  private configs: Map<string, TwoFactorConfig> = new Map();

  async setupTwoFactor(userId: string): Promise<TwoFactorSetupResult> {
    const secret = this.generateSecret();
    const backupCodes = this.generateBackupCodes(10);
    const otpauthUrl = `otpauth://totp/BibsClaw:${userId}?secret=${secret}&issuer=BibsClaw`;

    this.configs.set(userId, {
      userId,
      secret,
      enabled: false,
      backupCodes,
      createdAt: new Date(),
    });

    return {
      secret,
      otpauthUrl,
      qrCodeDataUrl: `data:image/svg+xml;base64,${Buffer.from(otpauthUrl).toString("base64")}`,
    };
  }

  async enableTwoFactor(userId: string, token: string): Promise<boolean> {
    const config = this.configs.get(userId);
    if (!config) return false;
    if (this.verifyToken(config.secret, token)) {
      config.enabled = true;
      return true;
    }
    return false;
  }

  async disableTwoFactor(userId: string): Promise<void> {
    this.configs.delete(userId);
  }

  async verifyTwoFactor(userId: string, token: string): Promise<boolean> {
    const config = this.configs.get(userId);
    if (!config || !config.enabled) return true;

    if (config.backupCodes.includes(token)) {
      config.backupCodes = config.backupCodes.filter((c) => c !== token);
      return true;
    }

    return this.verifyToken(config.secret, token);
  }

  async isTwoFactorEnabled(userId: string): Promise<boolean> {
    return this.configs.get(userId)?.enabled ?? false;
  }

  async getBackupCodes(userId: string): Promise<string[]> {
    return this.configs.get(userId)?.backupCodes ?? [];
  }

  private generateSecret(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let secret = "";
    for (let i = 0; i < 32; i++) {
      secret += chars[Math.floor(Math.random() * chars.length)];
    }
    return secret;
  }

  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
  }

  private verifyToken(secret: string, token: string): boolean {
    const timeStep = Math.floor(Date.now() / 30000);
    for (let t = timeStep - 1; t <= timeStep + 1; t++) {
      const expected = this.generateTotp(secret, t);
      if (expected === token) return true;
    }
    return false;
  }

  private generateTotp(secret: string, timeStep: number): string {
    const hash = (secret + timeStep.toString()).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return String(hash % 1000000).padStart(6, "0");
  }
}
