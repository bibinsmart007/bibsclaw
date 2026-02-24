import crypto from 'crypto';

export interface TOTPConfig {
  secretLength: number;
  period: number;
  digits: number;
  algorithm: string;
}

export interface TwoFactorSetup {
  secret: string;
  otpauthUrl: string;
  backupCodes: string[];
}

const DEFAULT_CONFIG: TOTPConfig = {
  secretLength: 20,
  period: 30,
  digits: 6,
  algorithm: 'sha1',
};

export class TwoFactorAuth {
  private config: TOTPConfig;
  private enabledUsers: Map<string, { secret: string; backupCodes: string[] }> = new Map();

  constructor(config: Partial<TOTPConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  generateSecret(): string {
    const buffer = crypto.randomBytes(this.config.secretLength);
    return this.base32Encode(buffer);
  }

  private base32Encode(buffer: Buffer): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    let bits = 0;
    let value = 0;
    for (const byte of buffer) {
      value = (value << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        bits -= 5;
        result += alphabet[(value >>> bits) & 31];
      }
    }
    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 31];
    }
    return result;
  }

  setup(userId: string, issuer: string = 'BibsClaw'): TwoFactorSetup {
    const secret = this.generateSecret();
    const backupCodes = this.generateBackupCodes(8);
    const otpauthUrl = `otpauth://totp/${issuer}:${userId}?secret=${secret}&issuer=${issuer}&algorithm=${this.config.algorithm.toUpperCase()}&digits=${this.config.digits}&period=${this.config.period}`;
    this.enabledUsers.set(userId, { secret, backupCodes });
    return { secret, otpauthUrl, backupCodes };
  }

  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  private generateTOTP(secret: string, counter: number): string {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(counter));
    const decodedSecret = this.base32Decode(secret);
    const hmac = crypto.createHmac(this.config.algorithm, decodedSecret);
    hmac.update(buffer);
    const hash = hmac.digest();
    const offset = hash[hash.length - 1] & 0xf;
    const code = ((hash[offset] & 0x7f) << 24) | ((hash[offset + 1] & 0xff) << 16) | ((hash[offset + 2] & 0xff) << 8) | (hash[offset + 3] & 0xff);
    return String(code % Math.pow(10, this.config.digits)).padStart(this.config.digits, '0');
  }

  private base32Decode(encoded: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const bytes: number[] = [];
    let bits = 0;
    let value = 0;
    for (const char of encoded.toUpperCase()) {
      const idx = alphabet.indexOf(char);
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        bits -= 8;
        bytes.push((value >>> bits) & 0xff);
      }
    }
    return Buffer.from(bytes);
  }

  verify(userId: string, token: string): boolean {
    const userData = this.enabledUsers.get(userId);
    if (!userData) return false;
    const counter = Math.floor(Date.now() / 1000 / this.config.period);
    for (let i = -1; i <= 1; i++) {
      if (this.generateTOTP(userData.secret, counter + i) === token) {
        return true;
      }
    }
    const codeIndex = userData.backupCodes.indexOf(token.toUpperCase());
    if (codeIndex !== -1) {
      userData.backupCodes.splice(codeIndex, 1);
      return true;
    }
    return false;
  }

  isEnabled(userId: string): boolean {
    return this.enabledUsers.has(userId);
  }

  disable(userId: string): boolean {
    return this.enabledUsers.delete(userId);
  }

  getBackupCodes(userId: string): string[] | null {
    return this.enabledUsers.get(userId)?.backupCodes ?? null;
  }

  regenerateBackupCodes(userId: string): string[] | null {
    const userData = this.enabledUsers.get(userId);
    if (!userData) return null;
    userData.backupCodes = this.generateBackupCodes(8);
    return userData.backupCodes;
  }
}

export const twoFactorAuth = new TwoFactorAuth();
