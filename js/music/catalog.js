// The track catalogue: one flat list built from js/tracks.js + js/music/tags.js. Pure data, no DOM, no audio.
// Track id = "albumKey:NN" (e.g. "phonkami:02"). Playlists store ids only, so renaming a title or file never breaks them.
import { ALBUMS } from "../tracks.js";
import { COUNTRIES, ALBUM_META, TRACK_META } from "./tags.js";

export const trackId = (albumKey, n) => `${albumKey}:${n}`;

export function createCatalog(albums = ALBUMS, albumMeta = ALBUM_META, trackMeta = TRACK_META, countries = COUNTRIES) {
  const tracks = [];
  for (const [albumKey, a] of Object.entries(albums)) {
    for (const t of a.tracks) {
      const id = trackId(albumKey, t.n), am = albumMeta[albumKey] || {}, tm = trackMeta[id] || {};
      tracks.push({
        id, albumKey, album: a.name, n: t.n, title: t.title, mood: t.mood, desc: t.desc, src: t.src,
        art: a.art, accent: a.palette[0], page: a.page, songUrl: `song.html?a=${albumKey}&t=${t.n}`,
        countries: tm.countries || am.countries || [], genres: tm.genres || am.genres || ["phonk"],
      });
    }
  }
  const byId = new Map(tracks.map((t) => [t.id, t]));
  const group = (keyFn) => { const m = new Map(); for (const t of tracks) for (const k of keyFn(t)) (m.get(k) || m.set(k, []).get(k)).push(t); return m; };

  return {
    tracks, get: (id) => byId.get(id) || null, has: (id) => byId.has(id),
    resolve(ids) { const found = [], missing = []; for (const id of ids) (byId.has(id) ? found : missing).push(byId.get(id) || id); return { found, missing }; },
    /** Browse facets, always computed from the tags (new tracks/countries appear automatically). */
    byAlbum: () => [...group((t) => [t.albumKey])].map(([key, list]) => ({ key, name: list[0].album, tracks: list })),
    byCountry: () => [...group((t) => t.countries)].map(([code, list]) => ({ code, name: countries[code]?.name || code, region: countries[code]?.region || "", tracks: list }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    byGenre: () => [...group((t) => t.genres)].map(([name, list]) => ({ name, tracks: list })).sort((a, b) => b.tracks.length - a.tracks.length || a.name.localeCompare(b.name)),
    search(q) { q = q.trim().toLowerCase(); return q ? tracks.filter((t) => `${t.title} ${t.album} ${t.mood}`.toLowerCase().includes(q)) : []; },
  };
}

export const catalog = createCatalog();
