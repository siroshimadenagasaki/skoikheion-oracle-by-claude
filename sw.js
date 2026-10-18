// Service worker Stoikheion — OFFLINE-FIRST.
// La app se carga UNA vez y después no usa internet: index.html, sonidos, MIDIs, fondos, avatares, canciones y la
// lista de archivos de GitHub salen del caché. La red solo se usa para lo que todavía no está guardado.
// Para traer la versión nueva (código + todos los archivos): botón "Reload sounds and code" en la pestaña Tools.
// (Los .sf2 NO pasan por acá: los guarda IndexedDB en el index.)
// El caché 'stk-offline' es PERSISTENTE: cambiar este archivo no borra lo que bajó el botón.
const CACHE = 'stk-offline';
const PRECACHE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const FONT_HOSTS = /(^|\.)(fonts\.googleapis|fonts\.gstatic)\.com$/;
// La lista de archivos del repo (un solo pedido a la API de GitHub) la usan varios módulos; el botón Reload la guarda acá.
const isTree = u => u.hostname === 'api.github.com' && /\/git\/trees\//.test(u.pathname);

self.addEventListener('install', e => {
  // cache:'reload' = saltea el caché HTTP del navegador (GitHub Pages cachea ~10 min): se guarda lo último publicado.
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(PRECACHE.map(u => c.add(new Request(u, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => /^shell-/.test(k)).map(k => caches.delete(k))))   // cachés de versiones viejas de este archivo
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.searchParams.has('stknet')) return;               // pedido que debe ir SIEMPRE a la red (lo usa el botón Reload)
  if (/\.sf2$/i.test(url.pathname)) return;                 // lo maneja IndexedDB
  const tree = isTree(url);
  if (url.hostname === 'api.github.com' && !tree) return;   // otras llamadas a la API: directo a la red
  const same = url.origin === location.origin;
  if (!(same || tree || FONT_HOSTS.test(url.hostname))) return;
  // CACHÉ PRIMERO: si ya está guardado se usa sin preguntarle nada a la red.
  e.respondWith(
    caches.match(req, { ignoreSearch: same }).then(hit => {   // mismo origen: ignora ?v=…; fuentes y API: URL exacta
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => Promise.resolve(req.mode === 'navigate' ? caches.match('./index.html') : null).then(h => h || Response.error()));
    })
  );
});
