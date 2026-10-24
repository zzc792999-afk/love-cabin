// Service Worker for Love Cabin PWA / Android App
const CACHE_NAME = 'love-cabin-v4.5';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((url) => cache.add(url).catch((err) => console.warn('SW pre-cache skip:', url, err)))
      );
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key.startsWith('love-cabin-') && key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Private data and partial audio responses must stay outside the asset cache.
  if (url.origin !== self.location.origin ||
      /\/api(?:\/|$)/.test(url.pathname) ||
      e.request.headers.has('range') ||
      /\.(mp3|mp4|wav|ogg)$/i.test(url.pathname)) return;
  const storeResponse = async (response) => {
    if (response && response.status === 200 && response.type !== 'opaque' &&
        !/no-store|private/i.test(response.headers.get('cache-control') || '')) {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(e.request, response.clone());
      } catch (error) {
        // A full cache must not prevent the network response from reaching the page.
        console.warn('SW cache write skipped:', error);
      }
    }
    return response;
  };

  // API 请求、页面导航 (HTML) 与核心脚本样式 (.js, .css) 走网络优先，确保代码热更新即刻生效
  const isApi = e.request.url.includes('/api/');
  const isHtml = e.request.mode === 'navigate' ||
                 (e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html')) ||
                 e.request.url.endsWith('/') ||
                 e.request.url.includes('.html');
  const isCode = e.request.url.includes('.js') || e.request.url.includes('.css');

  if (isApi || isHtml || isCode) {
    e.respondWith(
      fetch(e.request)
        .then(storeResponse)
        .catch(async () => (await caches.match(e.request)) ||
          new Response('当前处于离线状态，请联网后重试。', {
            status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          }))
    );
  } else {
    // 静态多媒体资源（图片、字体、音频等）：缓存优先，网络回退
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        return cachedResponse || fetch(e.request)
          .then(storeResponse)
          .catch(() => new Response('', { status: 408, statusText: 'Offline' }));
      })
    );
  }
});
