// Stoikheion Oracle — service worker
// Estrategia: red primero (con revalidación), caché solo como respaldo offline.
// Así, lo que subas al repo llega solo a la app del iPhone al abrirla con conexión.

const CACHE_NAME = "stoikheion-v3"; // solo se cambia si modificás ESTE archivo

// Lo mínimo para que la app abra sin conexión la primera vez.
// Soundfonts y MIDIs se cachean solos la primera vez que se usan.
const PRECACHE = [
  "./",
  "index.html",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      try {
        // "no-cache": pregunta al servidor si cambió (ETag). Si no cambió,
        // el navegador reutiliza su copia local y no vuelve a bajar el archivo.
        const res = await fetch(req, { cache: "no-cache" });
        if (res.ok) {
          const etag = res.headers.get("etag");
          // Solo reescribe la caché si el archivo cambió (evita regrabar 20MB de .sf2 en cada apertura).
          if (!cached || !etag || etag !== cached.headers.get("etag")) {
            cache.put(req, res.clone());
          }
        }
        return res;
      } catch (err) {
        // Sin conexión: usa lo que haya en caché.
        return cached || Response.error();
      }
    })()
  );
});
