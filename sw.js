// Service Worker – Aufmaß-Assistent Tischlerei Prigge
// Offline-Betrieb: Beim ersten Öffnen mit Netz werden alle Dateien im Gerät abgelegt.
// Die App startet IMMER sofort aus dem Gerätespeicher (auch im Flugmodus oder bei schlechtem Netz) und
// holt sich im Hintergrund die neueste Version, die beim nächsten Start aktiv ist.
// Bei einer neuen Dateiversion genügt es, die Dateien auf GitHub zu ersetzen.
// VERSION nur ändern, wenn der alte Zwischenspeicher sicher verworfen werden soll.
const VERSION = 'aufmass-v2';
const DATEIEN = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(DATEIEN.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting()));
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
    // Seite: sofort aus dem Speicher; Aktualisierung im Hintergrund (ohne Netz still ignoriert)
    e.respondWith(caches.match('index.html', { ignoreSearch: true }).then(gespeichert => {
      const netz = fetch(req).then(r => {
        if (r && r.ok) { const k = r.clone(); caches.open(VERSION).then(c => c.put('index.html', k)); }
        return r;
      }).catch(() => null);
      if (gespeichert) { e.waitUntil(netz); return gespeichert; }
      return netz.then(r => r || new Response('Offline – bitte die App einmal mit Internet öffnen.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }));
    }));
    return;
  }

  // übrige Dateien (Symbole, Manifest): erst Speicher, sonst Netz
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(n => {
      if (n && n.ok) { const k = n.clone(); caches.open(VERSION).then(c => c.put(req, k)); }
      return n;
    })));
});
