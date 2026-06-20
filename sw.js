// Mat Player — service worker
// تنها وظیفه: کش کردن «پوسته‌ی» اپ (همون یک فایل index.html) برای بازشدن آفلاین.
// هیچ درخواست دیگه‌ای (Worker API، یوتیوب، فونت، تصاویر) رو دست نمی‌زنیم.

const CACHE_NAME = "matplayer-shell-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.add(self.registration.scope))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // فقط درخواست‌های navigation (یعنی خودِ صفحه) رو هندل می‌کنیم.
  // سرچ، استریم، لیریک و... همه باید مستقیم به نت برن.
  if (req.method !== "GET" || req.mode !== "navigate") return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches
          .open(CACHE_NAME)
          .then((cache) => cache.put(req, copy))
          .catch(() => {});
        return res;
      })
      .catch(() =>
        caches
          .match(req)
          .then((cached) => cached || caches.match(self.registration.scope))
      )
  );
});
