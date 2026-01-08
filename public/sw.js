const CACHE_NAME = "property-notes-v14"; // 🔥 GANTI SETIAP UPDATE
const ASSETS = [
  "/",
  "/index.html",
  "/unit.html",
  "/progres.html",
  "/pemasukan.html",
  "/setting.html",
  "/manifest.json",
  "/css/style.css",
  "/css/unit.css",
  "/css/progres.css",
  "/css/pemasukan.css",
  "/css/setting.css",
  "/js/app.js",
  "/js/i18n.js",
  "/js/unit.js",
  "/js/progres.js",
  "/js/pemasukan.js",
  "/js/setting.js",
  "/js/db.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/lang/en.json",
  "/lang/id.json"
];

// ===============================
// INSTALL
// ===============================
self.addEventListener("install", event => {
  self.skipWaiting(); // ⛔ langsung aktif
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
});

// ===============================
// ACTIVATE
// ===============================
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim(); // 🔥 ambil kontrol semua tab
});

// ===============================
// FETCH
// ===============================
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
