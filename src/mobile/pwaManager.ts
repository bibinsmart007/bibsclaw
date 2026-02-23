import * as fs from "fs";
import * as path from "path";

export interface PWAManifest {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  display: "standalone" | "fullscreen" | "minimal-ui" | "browser";
  background_color: string;
  theme_color: string;
  icons: PWAIcon[];
  shortcuts?: PWAShortcut[];
  categories?: string[];
  orientation?: string;
}

export interface PWAIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

export interface PWAShortcut {
  name: string;
  short_name?: string;
  description?: string;
  url: string;
  icons?: PWAIcon[];
}

const BIBSCLAW_MANIFEST: PWAManifest = {
  name: "BibsClaw AI Assistant",
  short_name: "BibsClaw",
  description: "Your personal AI assistant - smarter than OpenClaw, built by Bibin from Abu Dhabi",
  start_url: "/",
  display: "standalone",
  background_color: "#0f172a",
  theme_color: "#6366f1",
  orientation: "any",
  categories: ["productivity", "utilities", "developer tools"],
  icons: [
    { src: "/icons/icon-72.png", sizes: "72x72", type: "image/png" },
    { src: "/icons/icon-96.png", sizes: "96x96", type: "image/png" },
    { src: "/icons/icon-128.png", sizes: "128x128", type: "image/png" },
    { src: "/icons/icon-144.png", sizes: "144x144", type: "image/png" },
    { src: "/icons/icon-152.png", sizes: "152x152", type: "image/png" },
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    { src: "/icons/icon-384.png", sizes: "384x384", type: "image/png" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
  ],
  shortcuts: [
    { name: "New Chat", short_name: "Chat", description: "Start a new AI conversation", url: "/?action=new-chat", icons: [{ src: "/icons/shortcut-chat.png", sizes: "96x96", type: "image/png" }] },
    { name: "Voice Mode", short_name: "Voice", description: "Activate voice assistant", url: "/?action=voice", icons: [{ src: "/icons/shortcut-voice.png", sizes: "96x96", type: "image/png" }] },
    { name: "Tasks", short_name: "Tasks", description: "View scheduled tasks", url: "/?tab=tasks", icons: [{ src: "/icons/shortcut-tasks.png", sizes: "96x96", type: "image/png" }] },
    { name: "Analytics", short_name: "Stats", description: "View usage analytics", url: "/?tab=analytics", icons: [{ src: "/icons/shortcut-analytics.png", sizes: "96x96", type: "image/png" }] },
  ],
};

export class PWAManager {
  private manifest: PWAManifest;
  private publicDir: string;

  constructor(publicDir: string = "src/web/public", manifest?: Partial<PWAManifest>) {
    this.publicDir = publicDir;
    this.manifest = { ...BIBSCLAW_MANIFEST, ...manifest };
  }

  generateManifest(): string {
    return JSON.stringify(this.manifest, null, 2);
  }

  saveManifest(): string {
    const manifestPath = path.join(this.publicDir, "manifest.json");
    fs.writeFileSync(manifestPath, this.generateManifest(), "utf-8");
    return manifestPath;
  }

  generateServiceWorker(): string {
    return `const CACHE_NAME = 'bibsclaw-v4.0';
const STATIC_CACHE = 'bibsclaw-static-v4.0';
const DYNAMIC_CACHE = 'bibsclaw-dynamic-v4.0';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/dashboard.css',
  '/js/dashboard.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== STATIC_CACHE && k !== DYNAMIC_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/socket.io/')) return;
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'BibsClaw';
  const options = {
    body: data.body || 'New notification',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    data: data,
    actions: data.actions || [],
    vibrate: [100, 50, 100],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'open') {
    event.waitUntil(clients.openWindow(event.notification.data.url || '/'));
  }
});
`;
  }

  saveServiceWorker(): string {
    const swPath = path.join(this.publicDir, "sw.js");
    fs.writeFileSync(swPath, this.generateServiceWorker(), "utf-8");
    return swPath;
  }

  getMetaTags(): string {
    return [
      '<meta name="apple-mobile-web-app-capable" content="yes">',
      '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
      '<meta name="apple-mobile-web-app-title" content="BibsClaw">',
      '<meta name="mobile-web-app-capable" content="yes">',
      '<meta name="theme-color" content="#6366f1">',
      '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
      '<link rel="manifest" href="/manifest.json">',
      '<link rel="apple-touch-icon" href="/icons/icon-192.png">',
    ].join("\n");
  }
}

export const pwaManager = new PWAManager();
