// Registers the service worker (https or localhost only) so the site can be installed / used offline.
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW registration failed:", e)));
}
