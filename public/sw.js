const CACHE_NAME = 'projetpilote-cache-v1';

const URLS_TO_CACHE = [
  '/',
  '/projects',
  '/manifest.json',
  '/offline.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(event.request);
      
      if (cachedResponse) {
        return cachedResponse;
      }

      // If it's a page navigation, return a basic offline page or the /projects cached route
      if (event.request.mode === 'navigate') {
        return cache.match('/projects') || new Response(
          '<html><head><meta charset="utf-8"><title>Hors Ligne</title></head><body><div style="text-align:center;padding:50px;font-family:sans-serif;"><h2>Vous êtes hors-ligne</h2><p>Veuillez vérifier votre connexion internet.</p></div></body></html>', 
          { headers: { 'Content-Type': 'text/html' } }
        );
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
