const VERSION = 'tocafy-v2';
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const SHELL_ASSETS = ['/', '/offline.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('tocafy-') && key !== SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

function isDataRequest(url) {
  // API (porta diferente) e endpoints do Next — sempre network-first, nunca serve token/áudio.
  return url.pathname.startsWith('/tracks') || url.pathname.startsWith('/api');
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icons') ||
    url.pathname.endsWith('.woff2')
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (isDataRequest(url)) {
    // Nunca cacheia áudio nem respostas privadas — sempre busca a rede.
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkFetch = fetch(request)
          .then((response) => {
            cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached ?? networkFetch;
      }),
    );
    return;
  }

  event.respondWith(
    fetch(request).catch(() =>
      caches.match(request).then((cached) => cached ?? caches.match('/offline.html')),
    ),
  );
});
