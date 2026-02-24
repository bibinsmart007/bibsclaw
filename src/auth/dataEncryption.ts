import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

export class DataEncryption {
  private masterKey: Buffer;

  constructor(password?: string) {
    const pw = password || process.env.ENCRYPTION_KEY || 'bibsclaw-default-key';
    this.masterKey = crypto.scryptSync(pw, 'bibsclaw-salt', KEY_LENGTH);
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.masterKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  decrypt(ciphertext: string): string {
    const data = Buffer.from(ciphertext, 'base64');
    const iv = data.subarray(0, IV_LENGTH);
    const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, this.masterKey, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final('utf8');
  }

  encryptJSON(obj: Record<string, unknown>): string {
    return this.encrypt(JSON.stringify(obj));
  }

  decryptJSON<T = Record<string, unknown>>(ciphertext: string): T {
    return JSON.parse(this.decrypt(ciphertext)) as T;
  }

  encryptFile(data: Buffer): Buffer {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.masterKey, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]);
  }

  decryptFile(data: Buffer): Buffer {
    const iv = data.subarray(0, IV_LENGTH);
    const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, this.masterKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}

export const dataEncryption = new DataEncryption();
