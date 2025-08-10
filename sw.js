/* Iron Dome Service Worker */

const CACHE_NAME = 'iron-dome-cache-v1';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './game.js',
  // Images
  './photos/bg.png',
  './photos/iran_rocket.png',
  './photos/iron_dom.png',
  './photos/israel_rocket.png',
  './photos/Trump.png',
  './photos/npc1.png',
  './photos/npc2.png',
  './photos/icon.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Handle navigation requests by serving the cached app shell
  if (request.mode === 'navigate' || (request.destination === 'document')) {
    event.respondWith(
      caches.match('./index.html').then((cached) => {
        return cached || fetch(request);
      })
    );
    return;
  }

  // Only handle same-origin requests
  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) {
    return; // Let the request pass through
  }

  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request)
        .then((networkResponse) => {
          // Only cache successful basic responses
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          return networkResponse;
        })
        .catch(() => {
          // Optional: return a fallback image for image requests when offline
          if (request.destination === 'image') {
            return caches.match('./photos/icon.png');
          }
        });
    })
  );
});