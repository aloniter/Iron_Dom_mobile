/* sw.js — Iron Dome PWA offline cache */

const VERSION = 'v1.0.0-' + (self.registration?.scope || 'local');
const APP_CACHE = `iron-dome-app-${VERSION}`;
const RUNTIME_CACHE = `iron-dome-runtime-${VERSION}`;

// Helper to make absolute URLs relative to SW scope (works on GitHub Pages subpaths)
const toURL = (path) => new URL(path, self.registration.scope).toString();

// Core files (app shell)
const APP_SHELL = [
  toURL('./'),
  toURL('./index.html'),
  toURL('./style.css'),
  toURL('./game.js'),
  toURL('./manifest.webmanifest')
];

// Static assets you reference in game.js + index.html
const STATIC_ASSETS = [
  './photos/bg.png',
  './photos/iran_rocket.png',
  './photos/iron_dom.png',
  './photos/israel_rocket.png',
  './photos/Trump.png',
  './photos/npc1.png',
  './photos/npc2.png',
  './photos/icon.png'
].map(toURL);

// On install: pre-cache the app shell + static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll([...APP_SHELL, ...STATIC_ASSETS]))
      .then(() => self.skipWaiting())
  );
});

// On activate: clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![APP_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Network helpers
const isNavigationRequest = (request) =>
  request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));

// Fetch strategy:
// 1) For navigations -> App Shell (index.html) fallback (SPA-style).
// 2) For same-origin GET -> Cache-first, then network; put successful network responses in runtime cache.
// 3) For cross-origin -> try network, fallback to cache if available.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET
  if (req.method !== 'GET') return;

  if (isNavigationRequest(req)) {
    // SPA app-shell strategy
    event.respondWith(
      fetch(req)
        .then((res) => {
          // cache a fresh copy of index.html
          const copy = res.clone();
          caches.open(APP_CACHE).then((cache) => cache.put(toURL('./index.html'), copy));
          return res;
        })
        .catch(() => caches.match(toURL('./index.html')))
    );
    return;
  }

  // Same-origin static/runtime assets: cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            // Only cache successful, basic responses
            if (!res || res.status !== 200 || res.type !== 'basic') return res;
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy));
            return res;
          })
          .catch(() => caches.match(toURL('./index.html'))); // last-resort fallback
      })
    );
    return;
  }

  // Cross-origin: network-first with cache fallback
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req))
  );
});