const CACHE = 'duckdb-studio-v1';

const ASSETS = [
  './',
  './index.html',
  './pyscript/core.css',
  './pyscript/core.js',
  './pyscript/pyodide/pyodide.js',
  './pyscript/pyodide/pyodide.asm.js',
  './pyscript/pyodide/pyodide.asm.wasm',
  './pyscript/pyodide/python_stdlib.zip',
  './pyscript/pyodide/pyodide-lock.json',
];

// نصب: فایلهای اصلی رو کش کن
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      // هر فایل جدا کش بشه تا اگه یکی نبود، بقیه fail نشن
      return Promise.all(
        ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('SW: skip', url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

// فعالسازی: کشهای قدیمی رو پاک کن
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// fetch: استراتژی هوشمند
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const isHeavy =
    /\.(wasm|whl|zip|js|css|json|data|png|jpg|svg)$/i.test(url.pathname) ||
    url.pathname.includes('/pyodide/') ||
    url.pathname.includes('/pyscript/');

  if (isHeavy) {
    // Cache-first برای فایلهای سنگین
    event.respondWith(
      caches.match(req).then(hit => {
        if (hit) return hit;
        return fetch(req).then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        });
      })
    );
  } else {
    // Network-first برای HTML
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
  }
});
