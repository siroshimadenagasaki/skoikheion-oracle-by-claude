// Service worker Stoikheion. Los .sf2 NO pasan por acá (los guarda IndexedDB en el index).
// Subí VERSION si querés forzar limpiar este cache.
const VERSION = 'shell-v1';
const PRECACHE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (/\.sf2$/i.test(url.pathname)) return;                 // lo maneja IndexedDB
  if (url.hostname === 'api.github.com') return;            // la app ya tolera que falle
  const ok = url.origin === location.origin || /(^|\.)(fonts\.googleapis|fonts\.gstatic)\.com$/.test(url.hostname);
  if (!ok) return;
  // red primero (para ver actualizaciones), cache si no hay conexión
  e.respondWith(fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(h => h || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
