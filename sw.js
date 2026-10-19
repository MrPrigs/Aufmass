// Service Worker – Aufmaß-Assistent Tischlerei Prigge
// Macht die App offline nutzbar: Beim ersten Öffnen mit Netz werden alle Dateien im Gerät abgelegt.
// Seiten: erst Netz (damit neue Versionen ankommen), ohne Netz die gespeicherte Fassung.
// Bei einer neuen Dateiversion genügt es, die Dateien auf GitHub zu ersetzen; VERSION nur ändern,
// wenn alte Zwischenspeicher sicher verworfen werden sollen.
const VERSION = 'aufmass-v1';
const DATEIEN = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => { const k = r.clone(); caches.open(VERSION).then(c => c.put('index.html', k)); return r; })
        .catch(() => caches.match('index.html').then(r => r || caches.match('./'))));
    return;
  }
  e.respondWith(
    caches.match(req).then(r => r || fetch(req).then(n => { const k = n.clone(); caches.open(VERSION).then(c => c.put(req, k)); return n; })));
});
