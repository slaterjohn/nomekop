// Nomekop offline service worker.
//
// Deliberately conservative so it can never serve stale app content:
//   • Navigations (full document loads) → network-first. The network is always
//     tried first, so an online user always gets the latest deploy; the cache is
//     only a fallback. A visited page is cached so it (and thus the app, with its
//     locally-stored collections) opens again offline; if nothing is cached we
//     fall back to /offline.html.
//   • Immutable build assets (/_next/static/*), the icons and fonts → cache-first
//     (stale-while-revalidate). They're content-hashed, so caching forever is safe.
//   • Everything else — the PostHog proxy (/ingest), API routes, RSC navigation
//     payloads, card images on other origins — is NOT intercepted and hits the
//     network normally. No dynamic data is ever cached.
//
// The cache name is versioned; bump it (or just redeploy this file, which the
// no-store header forces browsers to re-fetch) to roll out a new app shell.
const VERSION = "v1";
const PAGE_CACHE = `nomekop-pages-${VERSION}`;
const ASSET_CACHE = `nomekop-assets-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(ASSET_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([PAGE_CACHE, ASSET_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function cacheFirst(request) {
  return caches.open(ASSET_CACHE).then((cache) =>
    cache.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
}

function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    })
    .catch(() =>
      caches
        .match(request)
        .then((cached) => cached || caches.match(OFFLINE_URL)),
    );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // leave cross-origin (card CDNs) alone

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  const cacheable =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon-") ||
    url.pathname === "/apple-icon.png" ||
    /\.(?:css|js|woff2?|ttf|otf|png|svg)$/.test(url.pathname);

  if (cacheable) event.respondWith(cacheFirst(request));
});
