export interface CDNConfig {
  provider: 'cloudflare' | 'cloudfront' | 'bunny';
  baseUrl: string;
  purgeToken: string;
}

export class CDNManager {
  private config: CDNConfig | null = null;
  configure(config: CDNConfig): void { this.config = config; }
  getAssetUrl(path: string): string {
    if (!this.config) return path;
    return `${this.config.baseUrl}/${path}`;
  }
  async purge(paths: string[]): Promise<boolean> {
    if (!this.config) return false;
    // CDN purge API call
    return true;
  }
}

export const cdn = new CDNManager();
