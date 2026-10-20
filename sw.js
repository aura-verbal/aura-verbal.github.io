/* Aura · service worker: permite abrir la app sin conexión.
   Archivos propios: primero la red (para recibir actualizaciones) y, si no hay internet, la copia guardada.
   Tipografías de Google: primero la copia guardada. */
const VERSION = "aura-v8-1";
const CORE = [
  "./", "index.html", "js/motor.js", "js/app.js", "manifest.webmanifest",
  "data/paises.json", "data/escenarios/index.json",
  "data/escenarios/presentacion.json", "data/escenarios/entrevista.json",
  "data/escenarios/venta.json", "data/escenarios/cita.json",
  "data/escenarios/disertacion.json", "data/escenarios/practica.json", "data/escenarios/primerdia.json",
  "data/escenarios/devolucion.json", "data/escenarios/networking.json", "data/escenarios/callcenter.json",
  "hero.webp", "hero.jpg", "icon-192.png", "icon-512.png", "apple-touch-icon.png"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === "navigate" ? caches.match("index.html") : Response.error()))));
    return;
  }
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res;
    })));
  }
});
