/* Cache public, static files only. Never store workspace HTML, APIs or QR passes. */
const CACHE = "pamoja-static-b1a99347fef6e267";
const ASSETS = [
  "/offline.html",
  "/offline.css",
  "/icons/app-192.png",
  "/icons/app-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/favicon-32.png",
  "/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  // An update waits until the user chooses to reload or all old tabs close.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("pamoja-static-") && key !== CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const fallback = await caches.match("/offline.html", { cacheName: CACHE });
        return (
          fallback ||
          new Response("Pamoja is offline. Please reconnect and reload.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          })
        );
      }),
    );
    return;
  }

  // Next.js data/RSC requests and user-specific URLs always go to the network.
  const isStatic =
    !url.search && (ASSETS.includes(url.pathname) || url.pathname.startsWith("/_next/static/"));
  if (!isStatic) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type === "basic") {
        // Keep storage bounded without evicting the offline fallback.
        if (url.pathname.startsWith("/_next/static/")) {
          const keys = (await cache.keys()).filter((key) =>
            new URL(key.url).pathname.startsWith("/_next/static/"),
          );
          if (keys.length >= 160) await cache.delete(keys[0]);
        }
        await cache.put(request, response.clone());
      }
      return response;
    })(),
  );
});
