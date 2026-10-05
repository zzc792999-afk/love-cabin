// Service Worker for Love Cabin PWA / Android App
const CACHE_NAME = 'love-cabin-v3.8';
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
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

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
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // 静态多媒体资源（图片、字体、音频等）：缓存优先，网络回退
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        return cachedResponse || fetch(e.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
            }
            return networkResponse;
          })
          .catch(() => new Response('', { status: 408, statusText: 'Offline' }));
      })
    );
  }
});
