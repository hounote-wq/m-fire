// ══════════════════════════════════════════════════════════════════
//  M-FIRE SERVICE WORKER
//  Mortar Fire Integrated Resolution Engine
//  Heavy Mortar Company · 3rd Armoured Brigade
// ══════════════════════════════════════════════════════════════════

const CACHE_NAME = 'm-fire-v10.4';
const CACHE_URLS = [
  './',
  './index.html'
];

// ─── INSTALL ─── Cache core assets
self.addEventListener('install', event => {
  console.log('[M-FIRE SW] Installing cache:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_URLS))
      .then(() => {
        console.log('[M-FIRE SW] Cache installed successfully');
      })
  );
});

// ─── ACTIVATE ─── Clean up old caches
self.addEventListener('activate', event => {
  console.log('[M-FIRE SW] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[M-FIRE SW] Removing old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[M-FIRE SW] Activated · claiming clients');
      return self.clients.claim();
    })
  );
});

// ─── FETCH ─── Cache-first strategy
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Return cached version if available
      if (cachedResponse) {
        // Fetch update in background (stale-while-revalidate)
        fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse.clone());
              });
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      // Not in cache — fetch from network
      return fetch(event.request)
        .then(networkResponse => {
          // Cache new successful responses
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback — serve main app
          return caches.match('./index.html');
        });
    })
  );
});

// ─── MESSAGE ─── Handle skip waiting for updates
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[M-FIRE SW] Skipping waiting — updating now');
    self.skipWaiting();
  }
});
