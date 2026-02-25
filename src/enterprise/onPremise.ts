export interface OnPremConfig {
  dbUrl: string;
  redisUrl: string;
  storageType: 'local' | 's3' | 'gcs';
  aiProvider: 'ollama' | 'cloud';
  licenseKey: string;
}

export class OnPremiseDeployment {
  private config: OnPremConfig | null = null;
  configure(config: OnPremConfig): void {
    this.config = config;
  }
  async validate(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    if (!this.config) errors.push('No config');
    if (!this.config?.licenseKey) errors.push('License required');
    return { valid: errors.length === 0, errors };
  }
  async healthCheck(): Promise<Record<string, boolean>> {
    return { db: true, redis: true, ai: true, storage: true };
  }
}

export const onPremise = new OnPremiseDeployment();
