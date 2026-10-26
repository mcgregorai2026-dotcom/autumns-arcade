// Autumn's Arcade service worker. The game page is NETWORK-FIRST (a new version shows on the next open when online;
// the cached copy is used offline). Icons/manifest: cache-first, refreshed in the background. Old caches are removed on activate.
const CACHE = 'autumns-arcade-af84757ea8';
const BUILD = '872209ad7d';
const PRECACHE = ["./","index.html","manifest.webmanifest","icons/apple-touch-icon.png","favicon.ico","icons/icon-192.png","icons/icon-32.png","icons/icon-512.png","icons/icon-maskable-192.png","icons/icon-maskable-512.png"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('autumns-arcade-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('message', e => { if (e.data && e.data.type === 'build?' && e.ports[0]) e.ports[0].postMessage({ build: BUILD }); });
const isPage = (req, url) => req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
self.addEventListener('fetch', e => { const req = e.request; const url = new URL(req.url); if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (isPage(req, url)) { e.respondWith(fetch(req, { cache: 'no-store' }).then(res => { if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); } return res; })
      .catch(() => caches.match('index.html').then(r => r || caches.match('./')))); return; }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => { const net = fetch(req).then(res => { if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; });
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; } return net; }).catch(() => Response.error())); });
