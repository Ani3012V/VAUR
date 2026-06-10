const CACHE = 'vaur-v23';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  'https://cdn.jsdelivr.net/npm/quagga@0.12.1/dist/quagga.min.js',
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Guarda en caché una respuesta válida
function save(req, res) {
  if (res && res.status === 200 && res.type !== 'opaque') {
    const clone = res.clone();
    caches.open(CACHE).then(c => c.put(req, clone));
  }
  return res;
}

// Librerías CDN (versionadas, nunca cambian): caché primero → rápido y offline
function cacheFirst(req) {
  return caches.match(req).then(hit => hit || fetch(req).then(res => save(req, res)));
}

// App propia (HTML, manifest, iconos): RED PRIMERO → siempre la última versión.
// Si no hay internet, usa la copia guardada.
function networkFirst(req) {
  return fetch(req)
    .then(res => save(req, res))
    .catch(() => caches.match(req).then(hit =>
      hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)
    ));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let sameOrigin = true;
  try { sameOrigin = new URL(req.url).origin === self.location.origin; } catch (err) {}
  e.respondWith(sameOrigin ? networkFirst(req) : cacheFirst(req));
});
