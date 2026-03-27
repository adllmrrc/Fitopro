const CACHE_NAME = 'fitopro-v2';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './logic.js',
  './assets/logo-fetiche.svg',
  './public/offline.html'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') return caches.match('./public/offline.html');
        return new Response('', { status: 503 });
      });
    })
  );
});
