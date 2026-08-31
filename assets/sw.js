/* TLUXE PWA service worker — safe, non-aggressive caching
   Never interferes with cart, checkout, account, or payments. */

const CACHE_NAME = 'tluxe-v8-static';
const STATIC_EXT = /\.(?:css|js|woff2?|ttf|otf|png|jpg|jpeg|webp|gif|svg|ico)(?:\?|$)/i;

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isSensitivePath(pathname) {
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/cart') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/payments') ||
    pathname.startsWith('/wallets') ||
    pathname.includes('/checkouts/')
  );
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }

  /* Never touch Shopify commerce / auth flows */
  if (isSensitivePath(url.pathname)) return;

  /* Navigations / HTML: network only — avoid stale prices/products */
  const acceptsHTML = (request.headers.get('accept') || '').includes('text/html');
  if (request.mode === 'navigate' || acceptsHTML) {
    event.respondWith(fetch(request));
    return;
  }

  /* Optional cache for static assets only (network-first) */
  if (!STATIC_EXT.test(url.pathname)) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
