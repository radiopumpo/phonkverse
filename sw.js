/* PHONKVERSE service worker.
   - Precaches the app shell so the site opens offline.
   - HTML/CSS/JS: network-first (you always get fresh code when online), cache as offline fallback.
   - Images, textures, fonts, icons: cache-first.
   - Audio (.mp3) and Range requests are NOT intercepted: Safari needs real range responses, and tracks are large.
   Bump VERSION on every deploy that changes precached files. */
const VERSION = "2026-10-28-1";
const CACHE = `phonkverse-${VERSION}`;
const SHELL = [
  "./", "index.html", "phonkita.html", "phonkazo.html", "song.html", "manifest.webmanifest",
  "css/style.css", "css/song.css",
  "js/main.js", "js/player.js", "js/bgm.js", "js/pwa.js", "js/tracks.js", "js/upcoming.js", "js/voices.js",
  "js/globe/index.js", "js/globe/config.js", "js/globe/geo.js", "js/globe/earth.js", "js/globe/network.js",
  "js/globe/markers.js", "js/globe/controls.js", "js/globe/ui.js", "js/globe/scroll.js",
  "js/song/index.js", "js/song/audio.js", "js/song/visual.js",
  "vendor/three.module.min.js",
  "assets/globe/earth-night-4k.jpg", "assets/globe/earth-lights-2k.jpg", "assets/globe/earth-clouds-1k.png",
  "assets/images/home-hero-reference.webp", "assets/images/radiopumpo-logo.jpg",
  "assets/icons/icon-192.png", "assets/icons/icon.svg", "favicon.ico",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(SHELL.map((u) => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("phonkverse-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const isCode = (url, req) => req.mode === "navigate" || /\.(?:html|css|js|webmanifest)$/.test(url.pathname) || url.pathname.endsWith("/");

self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || req.headers.has("range") || /\.(?:mp3|m4a|wav|ogg)$/i.test(url.pathname)) return;   // let the browser handle media

  if (url.origin === location.origin && isCode(url, req)) {                  // network-first
    e.respondWith(fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === "navigate" ? caches.match("index.html") : Response.error()))));
    return;
  }
  const cacheable = url.origin === location.origin || /(?:fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname);
  if (!cacheable) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {   // cache-first
    if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
