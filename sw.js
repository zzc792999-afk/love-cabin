// Service Worker for Love Cabin PWA / Android App
const CACHE_NAME = 'love-cabin-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
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

  // API 请求与页面导航 (HTML) 走网络优先，离线时回退到缓存
  const isApi = e.request.url.includes('/api/');
  const isHtml = e.request.mode === 'navigate' ||
                 (e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html')) ||
                 e.request.url.endsWith('/') ||
                 e.request.url.includes('.html');

  if (isApi || isHtml) {
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && isHtml) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // 静态资源（CSS, JS, 图片等）
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        return cachedResponse || fetch(e.request).then((networkResponse) => {
          return networkResponse;
        });
      })
    );
  }
});
