// The persistent shell. Loaded by every page; boots ONCE per hard load and then lives across soft navigations.
// Owns: the player (audio + queue), playlists, the dock, the library, the router and per-page lifecycles.
import { catalog } from "../music/catalog.js";
import { createPlayer } from "../music/engine.js";
import { createPlaylistStore, browserStorage, decodeShare } from "../music/playlists.js";
import { contextIds } from "../music/context.js";
import { createRouter } from "./router.js";
import { mountDock } from "../ui/dock.js";
import { createLibrary } from "../ui/library.js";

const storage = browserStorage();
const player = createPlayer({ catalog, storage });
const playlists = createPlaylistStore({ storage });
const ctx = (spec) => contextIds(spec, { catalog, playlists });
const library = createLibrary({ player, catalog, playlists, ctx });
const pv = { player, catalog, playlists, library, ctx, navigate: (url) => router.go(url) };
window.pv = pv;

/** Declarative buttons anywhere in the site: <button data-pv="play|shuffle|menu|library" data-ctx="album:phonkita" data-start="phonkita:03"> */
document.addEventListener("click", (e) => {
  const b = e.target.closest?.("[data-pv]"); if (!b) return;
  const act = b.dataset.pv, ids = b.dataset.ctx ? ctx(b.dataset.ctx) : [], start = b.dataset.start || null;
  if (act === "play") { if (start && player.state().id === start) player.toggle(); else player.playContext(ids, start, { shuffle: false }); }
  else if (act === "shuffle") player.playContext(ids, null, { shuffle: true });
  else if (act === "menu") library.openTrackMenu(b, start);
  else if (act === "library") library.open(b.dataset.tab || "queue");
});

const PAGES = { "home-page": () => import("../pages/home.js"), "album-page": () => import("../pages/album.js"), "song-page": () => import("../pages/song.js") };
let teardown = null;
async function mountPage() {
  const key = Object.keys(PAGES).find((k) => document.body.classList.contains(k)); if (!key) return;
  const mod = await PAGES[key](); const stop = mod.mount({ pv }); teardown = typeof stop === "function" ? stop : null;
}
const dock = mountDock(player, { openLibrary: () => library.open("queue") });
const router = createRouter({
  beforeSwap: () => { try { teardown?.(); } catch (e) { console.warn(e); } teardown = null; library.closeMenu(); },
  afterSwap: () => { dock.refresh(); window.dispatchEvent(new Event("pv:navigated")); mountPage(); },
});

player.restore(); dock.refresh();
mountPage();

// Shared playlist link: ?pl=<token> → offer to play/save it
const token = new URLSearchParams(location.search).get("pl");
if (token) { const d = decodeShare(token, catalog); if (d.ids.length) { library.showShared(d); history.replaceState(history.state, "", location.pathname + location.hash); } }
