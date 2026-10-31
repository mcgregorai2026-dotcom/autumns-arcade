// Autumn's Arcade service worker. The game page is NETWORK-FIRST (a new version shows on the next open when online;
// the cached copy is used offline). Icons/manifest: cache-first, refreshed in the background. Old caches are removed on activate.
const CACHE = 'autumns-arcade-5ce7fe3e24';
const BUILD = 'e620a91c77';
const PRECACHE = ["./","index.html","manifest.webmanifest","icons/apple-touch-icon.png","favicon.ico","icons/icon-192.png","icons/icon-32.png","icons/icon-512.png","icons/icon-maskable-192.png","icons/icon-maskable-512.png"];
// v15 music: own cache (kept across app updates; file names carry a content hash). The Main Menu loop is precached; the
// other loops are cached the first time they play AND fetched quietly in the background after activation, so offline play has music.
const MUSIC_CACHE = 'aa-music-1', MUSIC = ["music/riley.1d9edf5c.mp3","music/carefree.274e13d7.mp3","music/easy-lemon.18e2e0c8.mp3","music/daily-beetle.eddc737a.mp3","music/rainbows.bdf74727.mp3","music/apple-cider.e7a69c31.mp3","music/wallpaper.85762ee8.mp3","music/glitter-blast.60bcea62.mp3","music/itty-bitty.44610c02.mp3","music/adventureland.0cec7f12.mp3","music/bit-quest.00aa6d59.mp3"], MENU_TRACK = 'music/riley.1d9edf5c.mp3';
const warmMusic = () => caches.open(MUSIC_CACHE).then(async c => { const want = new Set(MUSIC.map(u => new URL(u, self.registration.scope).href));
  for (const k of await c.keys()) if (!want.has(k.url)) await c.delete(k);
  for (const u of MUSIC) { if (await c.match(u)) continue; try { const r = await fetch(u); if (r.ok) await c.put(u, r); } catch (e) {} } }).catch(() => {});
self.addEventListener('install', e => { e.waitUntil(Promise.all([caches.open(CACHE).then(c => c.addAll(PRECACHE.map(u => new Request(u, { cache: 'reload' })))),
  caches.open(MUSIC_CACHE).then(c => c.match(MENU_TRACK).then(hit => hit || c.add(MENU_TRACK))).catch(() => {})]).then(() => self.skipWaiting())); });
// v10b: caches made by the OLD cache-first workers (v1 to v8). Pages they served have no update code, so after taking over we
// reload those open pages ourselves onto the new build (it happens on her first open, no tap needed).
const CACHE_FIRST_ERA = ['autumns-arcade-d95cca9a8c', 'autumns-arcade-3ad38f1d79', 'autumns-arcade-bf6649b664', 'autumns-arcade-f34dd877e4'];
self.addEventListener('activate', e => { let stale = false;
  const done = caches.keys().then(ks => { const old = ks.filter(k => k.startsWith('autumns-arcade-') && k !== CACHE); stale = old.some(k => CACHE_FIRST_ERA.includes(k)); return Promise.all(old.map(k => caches.delete(k))); }).catch(() => {}).then(() => self.clients.claim());
  e.waitUntil(done);
  // NOT inside waitUntil: the reload's page request needs this worker to be fully active first (otherwise it would wait on itself)
  done.then(() => setTimeout(warmMusic, 3000));
  done.then(() => stale && setTimeout(() => self.clients.matchAll({ type: 'window' }).then(cs => cs.forEach(c => c.navigate(c.url).catch(() => {}))), 50)); });
self.addEventListener('message', e => { if (e.data && e.data.type === 'build?' && e.ports[0]) e.ports[0].postMessage({ build: BUILD }); });
const isPage = (req, url) => req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
// <audio> (the compat engine) asks for byte ranges; answer them from the cached file with a 206 so the music stays seekable offline
const ranged = (req, hit) => { const r = req.headers.get('range'), m = r && /bytes=(\d*)-(\d*)/.exec(r); if (!m) return hit;
  return hit.arrayBuffer().then(b => { const n = b.byteLength, a = m[1] === '' ? Math.max(0, n - +m[2]) : +m[1], z = m[1] !== '' && m[2] !== '' ? Math.min(n - 1, +m[2]) : n - 1;
    if (a >= n || z < a) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + n } });
    return new Response(b.slice(a, z + 1), { status: 206, headers: { 'Content-Type': 'audio/mpeg', 'Content-Range': 'bytes ' + a + '-' + z + '/' + n, 'Content-Length': String(z - a + 1), 'Accept-Ranges': 'bytes' } }); }); };
self.addEventListener('fetch', e => { const req = e.request; const url = new URL(req.url); if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (isPage(req, url)) { e.respondWith(fetch(req, { cache: 'no-store' }).then(res => { if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); } return res; })
      .catch(() => caches.match('index.html').then(r => r || caches.match('./')))); return; }
  if (url.pathname.includes('/music/') && url.pathname.endsWith('.mp3')) { e.respondWith(caches.open(MUSIC_CACHE).then(c => c.match(req, { ignoreSearch: true }).then(hit => hit ? ranged(req, hit) : fetch(req).then(res => { if (res.ok && res.status === 200 && res.type === 'basic') c.put(req, res.clone()); return res; })))); return; }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => { const net = fetch(req).then(res => { if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; });
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; } return net; }).catch(() => Response.error())); });
