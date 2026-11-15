// StudyWeb Offline Service Worker + Generated Quiz Cache Strategy
const CACHE_NAME = 'studyweb-cache-v9';
const QUIZ_DATA_CACHE_NAME = 'studyweb-quiz-data-cache-v1';

const OFFLINE_ASSETS = [
  '/',
  '/index.html',
  '/logo.png',
  '/logo-inner.png',
  '/favicon.png',
  '/favicon.ico',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/favicon-48x48.png',
  '/favicon-192x192.png',
  '/favicon-512x512.png',
  '/apple-touch-icon.png'
];

// Deterministic lightweight hash for quiz generation request payloads
function hashQuizPayload(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function createJsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: new Headers({
      'Content-Type': 'application/json',
      'X-StudyWeb-SW-Cache': 'true',
      'Cache-Control': 'no-store'
    })
  });
}

// Install Event - Pre-cache shell assets & initialize quiz data cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(OFFLINE_ASSETS).catch((err) => {
          console.warn('[Service Worker] Non-fatal shell asset cache warning:', err);
        });
      }),
      caches.open(QUIZ_DATA_CACHE_NAME)
    ]).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up stale shell caches while strictly preserving QUIZ_DATA_CACHE_NAME
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== QUIZ_DATA_CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Message Event - Synchronize generated quiz sessions & active review progress into Service Worker CacheStorage
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  const uid = String(data.uid || 'guest');

  if (data.type === 'SYNC_QUIZ_HISTORY' && Array.isArray(data.sessions)) {
    const sessions = data.sessions;
    event.waitUntil(
      caches.open(QUIZ_DATA_CACHE_NAME).then(async (cache) => {
        const historyKeyUrl = new URL(`/__sw-quiz-cache/history/${encodeURIComponent(uid)}`, self.location.origin).toString();
        await cache.put(
          historyKeyUrl,
          createJsonResponse({
            uid,
            updatedAt: new Date().toISOString(),
            sessions
          })
        );

        // Also cache each individual quiz session by ID for direct offline lookup
        await Promise.all(
          sessions.map((session) => {
            if (!session || !session.id) return Promise.resolve();
            const sessionUrl = new URL(
              `/__sw-quiz-cache/session/${encodeURIComponent(uid)}/${encodeURIComponent(session.id)}`,
              self.location.origin
            ).toString();
            return cache.put(sessionUrl, createJsonResponse(session));
          })
        );

        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({
            ok: true,
            cachedSessionCount: sessions.length
          });
        }
      })
    );
  } else if (data.type === 'DELETE_QUIZ_SESSION' && data.sessionId) {
    const sessionId = String(data.sessionId);
    event.waitUntil(
      caches.open(QUIZ_DATA_CACHE_NAME).then(async (cache) => {
        const sessionUrl = new URL(
          `/__sw-quiz-cache/session/${encodeURIComponent(uid)}/${encodeURIComponent(sessionId)}`,
          self.location.origin
        ).toString();
        await cache.delete(sessionUrl);
        if (Array.isArray(data.sessions)) {
          const historyKeyUrl = new URL(`/__sw-quiz-cache/history/${encodeURIComponent(uid)}`, self.location.origin).toString();
          await cache.put(
            historyKeyUrl,
            createJsonResponse({
              uid,
              updatedAt: new Date().toISOString(),
              sessions: data.sessions
            })
          );
        }
      })
    );
  } else if (data.type === 'CACHE_QUIZ_DRAFT') {
    event.waitUntil(
      caches.open(QUIZ_DATA_CACHE_NAME).then(async (cache) => {
        const draftUrl = new URL(`/__sw-quiz-cache/draft/${encodeURIComponent(uid)}`, self.location.origin).toString();
        if (data.draft) {
          await cache.put(
            draftUrl,
            createJsonResponse({
              uid,
              updatedAt: new Date().toISOString(),
              draft: data.draft
            })
          );
        } else {
          await cache.delete(draftUrl);
        }
      })
    );
  }
});

// Fetch Event - Virtual Quiz Cache endpoints, NetworkFirst /api/generate-quiz caching, and Offline App Shell
self.addEventListener('fetch', (event) => {
  let requestUrl;
  try {
    requestUrl = new URL(event.request.url);
  } catch {
    return;
  }

  // Only handle same-origin HTTP/HTTPS requests
  if (requestUrl.origin !== self.location.origin || !requestUrl.protocol.startsWith('http')) {
    return;
  }

  // 1. Virtual Service Worker Quiz Cache Endpoints (GET /__sw-quiz-cache/*)
  if (requestUrl.pathname.startsWith('/__sw-quiz-cache/') && event.request.method === 'GET') {
    event.respondWith(
      caches.open(QUIZ_DATA_CACHE_NAME).then(async (cache) => {
        const matched = await cache.match(requestUrl.toString());
        if (matched) return matched;
        return createJsonResponse({ sessions: [], draft: null, cached: false }, 200);
      })
    );
    return;
  }

  // 2. NetworkFirst + Offline Cache Fallback for POST /api/generate-quiz
  if (requestUrl.pathname === '/api/generate-quiz' && event.request.method === 'POST') {
    event.respondWith(
      (async () => {
        let rawBody = '';
        try {
          rawBody = await event.request.clone().text();
        } catch {}

        const requestHash = hashQuizPayload(rawBody || 'default');
        const specificCacheUrl = new URL(`/__sw-quiz-cache/generated/${requestHash}`, self.location.origin).toString();
        const latestCacheUrl = new URL('/__sw-quiz-cache/generated/latest', self.location.origin).toString();

        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.ok) {
            const cloneForCache = networkResponse.clone();
            caches.open(QUIZ_DATA_CACHE_NAME).then(async (cache) => {
              try {
                const payload = await cloneForCache.json();
                if (payload && Array.isArray(payload.questions) && payload.questions.length > 0) {
                  const cachedPayload = {
                    ...payload,
                    cachedAt: new Date().toISOString()
                  };
                  await cache.put(specificCacheUrl, createJsonResponse(cachedPayload));
                  await cache.put(latestCacheUrl, createJsonResponse(cachedPayload));
                }
              } catch {}
            });
          }
          return networkResponse;
        } catch (networkErr) {
          // Offline fallback: return matching cached quiz or most recently cached generated quiz
          const cache = await caches.open(QUIZ_DATA_CACHE_NAME);
          const matchedSpecific = await cache.match(specificCacheUrl);
          if (matchedSpecific) {
            const data = await matchedSpecific.json().catch(() => null);
            if (data) {
              return createJsonResponse({ ...data, servedFromServiceWorkerCache: true });
            }
          }
          const matchedLatest = await cache.match(latestCacheUrl);
          if (matchedLatest) {
            const data = await matchedLatest.json().catch(() => null);
            if (data) {
              return createJsonResponse({ ...data, servedFromServiceWorkerCache: true });
            }
          }
          throw networkErr;
        }
      })()
    );
    return;
  }

  // 3. Never intercept other non-GET requests or dynamic API/Vite dev endpoints
  if (event.request.method !== 'GET') {
    return;
  }

  if (
    requestUrl.pathname.startsWith('/api/') ||
    requestUrl.pathname.startsWith('/auth/') ||
    requestUrl.pathname.startsWith('/src/') ||
    requestUrl.pathname.startsWith('/node_modules/') ||
    requestUrl.pathname.startsWith('/@') ||
    requestUrl.pathname.endsWith('.tsx') ||
    requestUrl.pathname.endsWith('.ts')
  ) {
    return;
  }

  // 4. Static assets & navigation - Network First with Cache Fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic' &&
          event.request.method === 'GET'
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          }).catch(() => {});
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
          return new Response('Network error occurred and no cached asset available.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
      })
  );
});
