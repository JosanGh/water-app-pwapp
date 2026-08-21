// 1. Correct Workbox CDN import
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

if (workbox) {
  console.log('Workbox loaded successfully');

  // Skip waiting and claim clients immediately on update
  workbox.core.skipWaiting();
  workbox.core.clientsClaim();

  // 2. Pre-cache static core assets
  workbox.precaching.precacheAndRoute([
    { url: '/', revision: 'v1' },
    { url: '/index.html', revision: 'v1' },
    { url: '/manifest.json', revision: 'v1' },
    { url: '/favicon.ico', revision: 'v1' }
  ]);

  // 3. Stale-While-Revalidate strategy for JS/CSS assets
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'script' || request.destination === 'style',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'static-resources',
    })
  );

  // 4. Cache-First strategy for images
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'images-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  );

  // 5. Network-First strategy for HTML navigation pages
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
      cacheName: 'pages-cache',
    })
  );
} else {
  console.error('Workbox failed to load');
}