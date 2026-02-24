
export interface ServiceWorkerConfig {
  cacheName: string;
  version: string;
  offlinePages: string[];
  cacheStrategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
}

export class ServiceWorkerManager {
  private config: ServiceWorkerConfig;
  private isRegistered: boolean = false;

  constructor(config?: Partial<ServiceWorkerConfig>) {
    this.config = {
      cacheName: config?.cacheName || 'bibsclaw-v4',
      version: config?.version || '4.0.0',
      offlinePages: config?.offlinePages || ['/dashboard', '/chat', '/analytics'],
      cacheStrategy: config?.cacheStrategy || 'network-first',
    };
  }

  generateServiceWorkerScript(): string {
    return [
      'const CACHE_NAME = "' + this.config.cacheName + '";',
      'const OFFLINE_URLS = ' + JSON.stringify(this.config.offlinePages) + ';',
      '',
      'self.addEventListener("install", (event) => {',
      '  event.waitUntil(',
      '    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))',
      '  );',
      '});',
      '',
      'self.addEventListener("activate", (event) => {',
      '  event.waitUntil(',
      '    caches.keys().then((names) =>',
      '      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))',
      '    )',
      '  );',
      '});',
      '',
      'self.addEventListener("fetch", (event) => {',
      '  event.respondWith(',
      '    fetch(event.request).catch(() => caches.match(event.request))',
      '  );',
      '});',
      '',
      'self.addEventListener("push", (event) => {',
      '  const data = event.data ? event.data.json() : { title: "BibsClaw", body: "New notification" };',
      '  event.waitUntil(',
      '    self.registration.showNotification(data.title, {',
      '      body: data.body,',
      '      icon: "/icons/icon-192.png",',
      '      badge: "/icons/badge-72.png",',
      '      tag: data.tag || "default",',
      '      data: data.url || "/dashboard"',
      '    })',
      '  );',
      '});',
      '',
      'self.addEventListener("notificationclick", (event) => {',
      '  event.notification.close();',
      '  event.waitUntil(clients.openWindow(event.notification.data));',
      '});',
    ].join('\n');
  }

  generateManifest(): object {
    return {
      name: 'BibsClaw AI Assistant',
      short_name: 'BibsClaw',
      description: 'AI-powered development assistant',
      start_url: '/dashboard',
      display: 'standalone',
      background_color: '#0f172a',
      theme_color: '#3b82f6',
      orientation: 'any',
      icons: [
        { src: '/icons/icon-72.png', sizes: '72x72', type: 'image/png' },
        { src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png' },
        { src: '/icons/icon-128.png', sizes: '128x128', type: 'image/png' },
        { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png' },
        { src: '/icons/icon-152.png', sizes: '152x152', type: 'image/png' },
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
      categories: ['developer-tools', 'productivity'],
      shortcuts: [
        { name: 'New Chat', url: '/dashboard/chat/new', description: 'Start a new conversation' },
        { name: 'Analytics', url: '/dashboard/analytics', description: 'View analytics' },
      ],
    };
  }

  async register(): Promise<boolean> {
    this.isRegistered = true;
    console.log('[ServiceWorker] Registration simulated for server-side');
    return true;
  }

  getStatus(): { registered: boolean; version: string } {
    return { registered: this.isRegistered, version: this.config.version };
  }
}

export const serviceWorkerManager = new ServiceWorkerManager();
