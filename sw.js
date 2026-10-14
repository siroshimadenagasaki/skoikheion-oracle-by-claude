// Service worker Stoikheion — OFFLINE-FIRST.
// Se carga UNA vez y después no toca la red: index.html y todo lo que la app ya pidió salen del caché.
// La red solo se usa para lo que todavía no está guardado. Para traer la versión nueva (código + sonidos):
// botón "Reload sounds and code" en la pestaña Tools. (Los .sf2 NO pasan por acá: los guarda IndexedDB en el index.)
// Si subís VERSION, el celular también se actualiza solo la próxima vez que abra la app con internet.
const VERSION = 'shell-v2';
const PRECACHE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const FONT_HOSTS = /(^|\.)(fonts\.googleapis|fonts\.gstatic)\.com$/;

self.addEventListener('install', e => {
  // cache:'reload' = saltea el caché HTTP del navegador (GitHub Pages cachea ~10 min): se guarda lo último publicado.
  e.waitUntil(
    caches.open(VERSION)
      .then(c => Promise.all(PRECACHE.map(u => c.add(new Request(u, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.searchParams.has('stknet')) return;               // pedido que debe ir SIEMPRE a la red (lo usa el botón Reload)
  if (/\.sf2$/i.test(url.pathname)) return;                 // lo maneja IndexedDB
  if (url.hostname === 'api.github.com') return;            // la app ya tolera que falle
  const ok = url.origin === location.origin || FONT_HOSTS.test(url.hostname);
  if (!ok) return;
  // CACHÉ PRIMERO: si ya está guardado se usa sin preguntarle nada a la red.
  e.respondWith(
    caches.match(req, { ignoreSearch: url.origin === location.origin }).then(hit => {   // mismo origen: ignora ?v=…; fuentes de Google: URL exacta
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => Promise.resolve(req.mode === 'navigate' ? caches.match('./index.html') : null).then(h => h || Response.error()));
    })
  );
});
