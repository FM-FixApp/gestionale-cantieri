'use strict';
// Service worker minimo di FMFixApp.
// Non conserva copie delle pagine né dei dati: ogni apertura scarica la versione aggiornata.
// Interviene solo se manca la connessione, mostrando una pagina di avviso al posto dell'errore del browser.
const CACHE = 'fmfixapp-offline-v1';
const PAGINA_OFFLINE = './offline.html';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add(PAGINA_OFFLINE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(chiavi => Promise.all(chiavi.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Solo apertura delle pagine: le chiamate al backend Google e le immagini passano senza modifiche.
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(PAGINA_OFFLINE, {cacheName: CACHE}))
  );
});
