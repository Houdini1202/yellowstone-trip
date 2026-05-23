const CACHE_NAME = 'ys-trip-v2';
const TILE_CACHE = 'ys-tiles-v1';

const APP_ASSETS = [
    './',
    './yellowstone_trip_map.html',
    './lib/leaflet.js',
    './lib/leaflet.css',
    './lib/images/marker-icon.png',
    './lib/images/marker-icon-2x.png',
    './lib/images/marker-shadow.png',
    './manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(APP_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME && k !== TILE_CACHE)
                    .map(k => caches.delete(k))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Cache map tiles with a network-first, fallback-to-cache strategy
    if (isTileRequest(url)) {
        event.respondWith(
            fetch(event.request).then((response) => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(TILE_CACHE).then((cache) => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            }).catch(() => {
                return caches.match(event.request);
            })
        );
        return;
    }

    // App assets: cache-first
    event.respondWith(
        caches.match(event.request).then((cached) => {
            return cached || fetch(event.request).then((response) => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            });
        })
    );
});

function isTileRequest(url) {
    return url.hostname.includes('arcgisonline.com') ||
           url.hostname.includes('opentopomap.org') ||
           url.hostname.includes('basemaps.cartocdn.com') ||
           url.hostname.includes('nationalmap.gov') ||
           url.hostname.includes('tile.openstreetmap.org');
}
