// PWA Manager - Phase 4.3: Mobile App
export interface PWAConfig {
  appName: string;
  shortName: string;
  themeColor: string;
  backgroundColor: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui';
}

export class PWAManager {
  private config: PWAConfig;
  constructor(config?: Partial<PWAConfig>) {
    this.config = { appName: 'BibsClaw', shortName: 'BibsClaw', themeColor: '#1e293b', backgroundColor: '#0f172a', display: 'standalone', ...config };
  }
  generateManifest(): object {
    return { name: this.config.appName, short_name: this.config.shortName, theme_color: this.config.themeColor, background_color: this.config.backgroundColor, display: this.config.display, start_url: '/', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }] };
  }
  getConfig(): PWAConfig { return { ...this.config }; }
}
