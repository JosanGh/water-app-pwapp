importScripts('https://googleapis.com');

if (workbox) {
  console.log('Workbox loaded successfully');

  // Force the waiting service worker to become active immediately
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));

  // 1. Pre-cache core assets for first-visit offline availability
  // Replace these with your actual build files (index.html, main.js, styles.css, etc.)
  workbox.precaching.precacheAndRoute([
    { url: '/', revision: 'v1' },
    { url: '/index.html', revision: 'v1' },
    { url: '/static/js/bundle.js', revision: 'v1' },
    { url: '/manifest.json', revision: 'v1' },
    { url: '/assets/vite.svg', revision: 'v1' }
  ]);

  // 2. Cache-first strategy for any runtime images
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'images-cache',
    })
  );
}


const CACHE_NAME = "pureledger-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/static/js/bundle.js",
  "/manifest.json",
  "/favicon.ico"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to keep cache updated
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {/* Offline fallback */});
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});