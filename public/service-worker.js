// Bump this on every deploy that changes cached file *names* in a
// non-hashed way (it's mostly a safety net — hashed asset filenames already
// bust their own cache on each build).
const CACHE_VERSION = 'v2';
const CACHE_NAME = `koboads-${CACHE_VERSION}`;

self.addEventListener('install', (event) => {
  // Activate this new service worker as soon as it finishes installing,
  // instead of waiting for every open tab to close first.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // let cross-origin requests (Firebase, etc.) pass through untouched

  // Navigation requests (the HTML shell) — always go to the network first so
  // a new deploy is picked up immediately. Falling back to the cached shell
  // only when fully offline. This is the fix for the previous cache-first-for-
  // everything strategy, which permanently stuck returning visitors on
  // whatever version happened to be cached on their very first visit.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Hashed static assets (JS/CSS/fonts/images under /_expo/static/ or
  // /assets/) are content-addressed — their filename changes whenever their
  // content does, so it's always safe to serve a cached copy first and only
  // hit the network on a cache miss.
  if (url.pathname.startsWith('/_expo/static/') || url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
    return;
  }

  // Everything else (manifest.json, icons, favicon, api-ish requests): try
  // the network, fall back to cache if offline.
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
