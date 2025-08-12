/* Iron Dome Service Worker */

const CACHE_NAME = 'iron-dome-cache-v2';
const PRECACHE_ASSETS = [
  './index.html',
  './style.css',
  './game.js',
  './manifest.webmanifest',
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
  // Try to precache everything, but do not fail the whole install if one file fails
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const addPromises = PRECACHE_ASSETS.map((url) => cache.add(url).catch(() => null));
      await Promise.allSettled(addPromises);
    }).then(() => self.skipWaiting())
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
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      caches.match('./index.html', { ignoreSearch: true }).then((cached) => {
        return cached || fetch(request).catch(() => caches.match('./index.html'));
      })
    );
    return;
  }

  // Only handle same-origin requests
  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) {
    return; // Let the request pass through
  }

  // Cache-first strategy for static assets (images, scripts, styles)
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cachedResponse) => {
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
          // Fallback for images when offline
          if (request.destination === 'image') {
            return caches.match('./photos/icon.png');
          }
        });
    })
  );
});