// Autumn's Arcade service worker: precaches everything for offline play; cache versioned by content hash.
const CACHE = 'autumns-arcade-d95cca9a8c';
const PRECACHE = ["./","index.html","manifest.webmanifest","icons/apple-touch-icon.png","favicon.ico","icons/icon-192.png","icons/icon-32.png","icons/icon-512.png","icons/icon-maskable-512.png"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('autumns-arcade-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => { const req = e.request; if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => { if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; }).catch(() => req.mode === 'navigate' ? caches.match('index.html') : Response.error()))); });
