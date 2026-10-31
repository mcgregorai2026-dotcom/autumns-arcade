// Autumn's Arcade service worker. The game page is NETWORK-FIRST (a new version shows on the next open when online;
// the cached copy is used offline). Icons/manifest: cache-first, refreshed in the background. Old caches are removed on activate.
const CACHE = 'autumns-arcade-ecad7156f0';
const BUILD = '802f0834d3';
const PRECACHE = ["./","index.html","manifest.webmanifest","icons/apple-touch-icon.png","favicon.ico","icons/icon-192.png","icons/icon-32.png","icons/icon-512.png","icons/icon-maskable-192.png","icons/icon-maskable-512.png"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
// v10b: caches made by the OLD cache-first workers (v1 to v8). Pages they served have no update code, so after taking over we
// reload those open pages ourselves onto the new build (it happens on her first open, no tap needed).
const CACHE_FIRST_ERA = ['autumns-arcade-d95cca9a8c', 'autumns-arcade-3ad38f1d79', 'autumns-arcade-bf6649b664', 'autumns-arcade-f34dd877e4'];
self.addEventListener('activate', e => { let stale = false;
  const done = caches.keys().then(ks => { const old = ks.filter(k => k.startsWith('autumns-arcade-') && k !== CACHE); stale = old.some(k => CACHE_FIRST_ERA.includes(k)); return Promise.all(old.map(k => caches.delete(k))); }).catch(() => {}).then(() => self.clients.claim());
  e.waitUntil(done);
  // NOT inside waitUntil: the reload's page request needs this worker to be fully active first (otherwise it would wait on itself)
  done.then(() => stale && setTimeout(() => self.clients.matchAll({ type: 'window' }).then(cs => cs.forEach(c => c.navigate(c.url).catch(() => {}))), 50)); });
self.addEventListener('message', e => { if (e.data && e.data.type === 'build?' && e.ports[0]) e.ports[0].postMessage({ build: BUILD }); });
const isPage = (req, url) => req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
self.addEventListener('fetch', e => { const req = e.request; const url = new URL(req.url); if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (isPage(req, url)) { e.respondWith(fetch(req, { cache: 'no-store' }).then(res => { if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); } return res; })
      .catch(() => caches.match('index.html').then(r => r || caches.match('./')))); return; }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => { const net = fetch(req).then(res => { if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; });
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; } return net; }).catch(() => Response.error())); });
