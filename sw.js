// Service Worker – Aufmaß-Assistent Tischlerei Prigge
// Offline-Betrieb: Beim ersten Öffnen mit Netz werden alle Dateien im Gerät abgelegt.
// Die App startet IMMER sofort aus dem Gerätespeicher (auch im Flugmodus oder bei schlechtem Netz) und
// prüft im Hintergrund, ob es eine neuere Version gibt (ohne Zwischenspeicher des Browsers). Gibt es eine,
// meldet der Service Worker das der Seite, die „Neue Version – jetzt neu laden“ anzeigt.
// Bei einer neuen Dateiversion genügt es, die Dateien auf GitHub zu ersetzen.
// VERSION nur ändern, wenn der alte Zwischenspeicher sicher verworfen werden soll.
const VERSION = 'aufmass-v3';
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

function melde() {
  return self.clients.matchAll({ type: 'window' }).then(cs => cs.forEach(c => c.postMessage({ neueVersion: true })));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // Seite: sofort aus dem Speicher; im Hintergrund mit Netz auf Aktualisierung prüfen (ohne Netz still ignoriert)
    e.respondWith(caches.match('index.html', { ignoreSearch: true }).then(gespeichert => {
      const netz = fetch(new URL('index.html', self.location).href, { cache: 'no-cache' }).then(async r => {
        if (r && r.ok) {
          const neu = r.clone();
          if (gespeichert) {
            try {
              const [alt, jetzt] = await Promise.all([gespeichert.clone().text(), r.clone().text()]);
              if (alt !== jetzt) { await caches.open(VERSION).then(c => c.put('index.html', neu)); await melde(); return r; }
            } catch (x) {}
          } else { await caches.open(VERSION).then(c => c.put('index.html', neu)); }
        }
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
