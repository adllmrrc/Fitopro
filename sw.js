const CACHE_VERSION = "v2";
const CORE_CACHE = `fitopro-core-${CACHE_VERSION}`;
const RUNTIME_CACHE = `fitopro-runtime-${CACHE_VERSION}`;
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./vendor/supabase.js",
  "./js/core/config.js",
  "./js/core/state.js",
  "./js/core/cache.js",
  "./js/core/supabaseClient.js",
  "./js/core/sync.js",
  "./js/core/dataLoader.js",
  "./js/core/dataService.js",
  "./js/core/pwa.js",
  "./js/core/authPages.js",
  "./js/app/appUi.js",
  "./js/app/appData.js",
  "./js/app/appStats.js",
  "./js/app/App.js",
  "./auth/confirm/",
  "./auth/confirm/index.html",
  "./auth/reset-password/",
  "./auth/reset-password/index.html",
  "./assets/icons/favicon-32.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

const APP_SHELL_EXTENSIONS = [".html", ".js", ".css", ".webmanifest"];

function isAppShellRequest(requestUrl) {
  const pathname = requestUrl.pathname.toLowerCase();
  return (
    APP_SHELL_EXTENSIONS.some((ext) => pathname.endsWith(ext)) ||
    pathname === "/" ||
    pathname.endsWith("/auth/confirm") ||
    pathname.endsWith("/auth/confirm/") ||
    pathname.endsWith("/auth/reset-password") ||
    pathname.endsWith("/auth/reset-password/")
  );
}

async function cacheShell() {
  const cache = await caches.open(CORE_CACHE);
  await cache.addAll(APP_SHELL);
}

async function networkFirst(request, fallbackUrl = null) {
  const cache = await caches.open(CORE_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === "basic") {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl);
      if (fallback) return fallback;
    }
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request)
    .then(async (response) => {
      if (response && response.status === 200 && response.type === "basic") {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheShell());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CORE_CACHE && key !== RUNTIME_CACHE) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request, "./index.html"));
    return;
  }

  if (isAppShellRequest(requestUrl)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(staleWhileRevalidate(event.request));
});
