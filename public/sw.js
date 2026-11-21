/* ============================================================
   Lean Bulk Studio — offline service worker
   ------------------------------------------------------------
   Strategy (deliberately safe for both dev and production):
   - GET navigations: network-first → cached app shell → /offline.html
   - Other same-origin GETs (_next/static, icons, fonts):
     network-first → runtime cache → nothing (rare)
   - Never touches: non-GET (cloud-sync POSTs), cross-origin,
     /api/* (always live) and dev HMR endpoints.
   Network-first keeps dev hot-reload correct (chunks change
   constantly) while still giving a full offline shell once any
   successful load has been cached.
   ============================================================ */

const VERSION = "v5";
const SHELL_CACHE = `lbs-shell-${VERSION}`;
const RUNTIME_CACHE = `lbs-runtime-${VERSION}`;
const MAX_RUNTIME_ENTRIES = 120;

const SHELL_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/logo.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // cache:"reload" bypasses the HTTP cache so the shell is fresh
      await Promise.allSettled(
        SHELL_ASSETS.map((asset) =>
          cache.add(new Request(asset, { cache: "reload" }))
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (k) =>
              k.startsWith("lbs-") && k !== SHELL_CACHE && k !== RUNTIME_CACHE
          )
          .map((k) => caches.delete(k))
      );
      // Trim the runtime cache so it never grows without bound
      const runtime = await caches.open(RUNTIME_CACHE);
      let keys2 = await runtime.keys();
      while (keys2.length > MAX_RUNTIME_ENTRIES) {
        await runtime.delete(keys2[0]);
        keys2 = await runtime.keys();
      }
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // cloud-sync POST etc. pass straight through

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // cross-origin: untouched
  if (url.pathname.startsWith("/api/")) return; // API is network-only
  if (url.pathname.startsWith("/_next/webpack-hmr")) return; // dev HMR

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(SHELL_CACHE);
          cache.put("/", res.clone()).catch(() => {});
          return res;
        } catch {
          const shell =
            (await caches.match("/", { ignoreSearch: true })) ||
            (await caches.match("/offline.html"));
          return shell || Response.error();
        }
      })()
    );
    return;
  }

  // Static & other same-origin GETs: network-first, cached when offline.
  event.respondWith(
    (async () => {
      try {
        const res = await fetch(req);
        if (res && res.ok && res.type === "basic") {
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(req, res.clone()).catch(() => {});
        }
        return res;
      } catch {
        const hit = await caches.match(req, { ignoreSearch: true });
        return hit || Response.error();
      }
    })()
  );
});
