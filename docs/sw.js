// 撮影ノート オフライン用 Service Worker
// 公開前に tools/bump-sw.py で CACHE の版数を上げること（古いキャッシュを確実に入れ替えるため）。

const CACHE = "cg-v3";

const PRECACHE = [
  "./",
  "index.html",
  "style.css",
  "js/data.js",
  "js/sim.js",
  "js/exif.js",
  "js/diagnose.js",
  "js/app.js",
  "manifest.webmanifest",
  "icon.svg",
  "icon-180.png",
  "icon-192.png",
  "icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
