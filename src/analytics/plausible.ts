export interface PlausibleConfig {
  domain: string;
  apiHost?: string;
  trackLocalhost?: boolean;
}
export class PlausibleTracker {
  private config: PlausibleConfig;
  constructor(config: PlausibleConfig) {
    this.config = { apiHost: 'https://plausible.io', ...config };
  }
  trackEvent(name: string, props?: Record<string, string>): void {
    const payload = {
      n: name, u: `https://${this.config.domain}`,
      d: this.config.domain, p: props ? JSON.stringify(props) : undefined,
    };
    fetch(`${this.config.apiHost}/api/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }
  trackPageview(path: string): void {
    this.trackEvent('pageview', { path });
  }
}
export const plausible = new PlausibleTracker({ domain: 'bibsclaw.com' });
