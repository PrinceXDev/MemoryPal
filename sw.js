const CACHE_NAME = "memorypal-v1.0.0";
const STATIC_CACHE = "memorypal-static-v1";
const DYNAMIC_CACHE = "memorypal-dynamic-v1";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/styles/main.css",
  "/styles/themes.css",
  "/styles/accessibility.css",
  "/styles/games.css",
  "/scripts/app.js",
  "/scripts/accessibility.js",
  "/scripts/audio.js",
  "/scripts/storage.js",
  "/scripts/games/sequence.js",
  "/scripts/games/matching.js",
  "/manifest.json",
];

const DYNAMIC_ASSETS = ["/assets/sounds/", "/assets/icons/", "/assets/images/"];

const NETWORK_TIMEOUT = 3000;

self.addEventListener("install", (event) => {
  console.log("MemoryPal Service Worker: Installing...");

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("MemoryPal Service Worker: Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log(
          "MemoryPal Service Worker: Static assets cached successfully"
        );
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error(
          "MemoryPal Service Worker: Failed to cache static assets:",
          error
        );
      })
  );
});

self.addEventListener("activate", (event) => {
  console.log("MemoryPal Service Worker: Activating...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log(
                "MemoryPal Service Worker: Deleting old cache:",
                cacheName
              );
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("MemoryPal Service Worker: Activated successfully");
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (url.origin !== location.origin) {
    return;
  }

  if (STATIC_ASSETS.some((asset) => request.url.includes(asset))) {
    event.respondWith(cacheFirstStrategy(request));
  } else if (isDynamicAsset(request.url)) {
    event.respondWith(staleWhileRevalidateStrategy(request));
  } else {
    event.respondWith(networkFirstStrategy(request));
  }
});

async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error(
      "MemoryPal Service Worker: Cache first strategy failed:",
      error
    );

    // Return offline fallback for HTML requests
    if (request.destination === "document") {
      return caches.match("/offline.html") || createOfflinePage();
    }

    throw error;
  }
}

// Stale while revalidate strategy for dynamic assets
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);

  const networkResponsePromise = fetch(request)
    .then((response) => {
      if (response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cachedResponse || networkResponsePromise;
}

// Network first strategy with timeout
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Network timeout")), NETWORK_TIMEOUT)
      ),
    ]);

    if (networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log(
      "MemoryPal Service Worker: Network failed, trying cache:",
      error.message
    );

    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline fallback for HTML requests
    if (request.destination === "document") {
      return caches.match("/offline.html") || createOfflinePage();
    }

    throw error;
  }
}

// Check if URL is a dynamic asset
function isDynamicAsset(url) {
  return DYNAMIC_ASSETS.some((pattern) => url.includes(pattern));
}

function createOfflinePage() {
  const offlineHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MemoryPal - Offline</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                margin: 0;
                padding: 2rem;
                background: #f8fafc;
                color: #0f172a;
                text-align: center;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
            }
            .offline-container {
                max-width: 500px;
                background: white;
                padding: 2rem;
                border-radius: 1rem;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .offline-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
            }
            .offline-title {
                font-size: 2rem;
                font-weight: 600;
                margin-bottom: 1rem;
                color: #2563eb;
            }
            .offline-message {
                font-size: 1.125rem;
                line-height: 1.6;
                margin-bottom: 2rem;
                color: #475569;
            }
            .retry-button {
                background: #2563eb;
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 0.5rem;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            .retry-button:hover {
                background: #1d4ed8;
            }
            .offline-features {
                margin-top: 2rem;
                text-align: left;
            }
            .offline-features h3 {
                color: #2563eb;
                margin-bottom: 1rem;
            }
            .offline-features ul {
                list-style: none;
                padding: 0;
            }
            .offline-features li {
                padding: 0.5rem 0;
                border-bottom: 1px solid #e2e8f0;
            }
            .offline-features li:last-child {
                border-bottom: none;
            }
        </style>
    </head>
    <body>
        <div class="offline-container">
            <div class="offline-icon">🧠</div>
            <h1 class="offline-title">MemoryPal</h1>
            <p class="offline-message">
                You're currently offline, but don't worry! MemoryPal works offline too.
                Some features may be limited, but you can still train your memory.
            </p>
            <button class="retry-button" onclick="window.location.reload()">
                Try Again
            </button>
            
            <div class="offline-features">
                <h3>Available Offline:</h3>
                <ul>
                    <li>✅ Sequence Memory Game</li>
                    <li>✅ Card Matching Game</li>
                    <li>✅ All Accessibility Features</li>
                    <li>✅ Progress Tracking</li>
                    <li>✅ Settings & Preferences</li>
                </ul>
            </div>
        </div>
        
        <script>
            // Check for connection and reload when back online
            window.addEventListener('online', () => {
                window.location.reload();
            });
            
            // Announce offline status for screen readers
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(
                    'You are currently offline. MemoryPal can still work in offline mode with limited features.'
                );
                speechSynthesis.speak(utterance);
            }
        </script>
    </body>
    </html>
  `;

  return new Response(offlineHTML, {
    headers: { "Content-Type": "text/html" },
  });
}

self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  try {
    console.log("MemoryPal Service Worker: Syncing data...");

    const clients = await self.clients.matchAll();

    clients.forEach((client) => {
      client.postMessage({
        type: "SYNC_DATA",
        message: "Syncing your progress...",
      });
    });

    console.log("MemoryPal Service Worker: Data sync completed");
  } catch (error) {
    console.error("MemoryPal Service Worker: Data sync failed:", error);
  }
}

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: "/assets/icons/icon-192x192.png",
    badge: "/assets/icons/badge-72x72.png",
    vibrate: [200, 100, 200],
    data: data.data,
    actions: [
      {
        action: "open",
        title: "Open MemoryPal",
        icon: "/assets/icons/action-open.png",
      },
      {
        action: "dismiss",
        title: "Dismiss",
        icon: "/assets/icons/action-dismiss.png",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "open" || !event.action) {
    event.waitUntil(clients.openWindow("/"));
  }
});

self.addEventListener("message", (event) => {
  const { type, data } = event.data;

  switch (type) {
    case "SKIP_WAITING":
      self.skipWaiting();
      break;

    case "CACHE_AUDIO":
      cacheAudioFiles(data.audioFiles);
      break;

    case "CLEAR_CACHE":
      clearAllCaches();
      break;

    default:
      console.log("MemoryPal Service Worker: Unknown message type:", type);
  }
});

async function cacheAudioFiles(audioFiles) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    await cache.addAll(audioFiles);
    console.log("MemoryPal Service Worker: Audio files cached");
  } catch (error) {
    console.error(
      "MemoryPal Service Worker: Failed to cache audio files:",
      error
    );
  }
}

async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    console.log("MemoryPal Service Worker: All caches cleared");
  } catch (error) {
    console.error("MemoryPal Service Worker: Failed to clear caches:", error);
  }
}

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "cleanup") {
    event.waitUntil(performCleanup());
  }
});

async function performCleanup() {
  try {
    console.log("MemoryPal Service Worker: Performing cleanup...");

    const cache = await caches.open(DYNAMIC_CACHE);
    const requests = await cache.keys();

    // Remove entries older than 7 days
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const dateHeader = response.headers.get("date");
        if (dateHeader && new Date(dateHeader).getTime() < oneWeekAgo) {
          await cache.delete(request);
        }
      }
    }

    console.log("MemoryPal Service Worker: Cleanup completed");
  } catch (error) {
    console.error("MemoryPal Service Worker: Cleanup failed:", error);
  }
}

self.addEventListener("error", (event) => {
  console.error("MemoryPal Service Worker: Error occurred:", event.error);
});

self.addEventListener("unhandledrejection", (event) => {
  console.error(
    "MemoryPal Service Worker: Unhandled promise rejection:",
    event.reason
  );
});

console.log("MemoryPal Service Worker: Loaded successfully");
