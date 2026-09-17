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

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // فقط همون دامنه رو کش کن
  if (url.origin !== location.origin) return;

  // فایلهای بزرگ Pyodide/wasm رو با استراتژی cache-first بگیر
  const isHeavy = /\.(wasm|whl|zip|js|css|json|data)$/.test(url.pathname)
                  || url.pathname.includes('/pyodide/')
                  || url.pathname.includes('/pyscript/');

  if (isHeavy) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }))
    );
  } else {
    // صفحه اصلی: network-first
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
  }
});
