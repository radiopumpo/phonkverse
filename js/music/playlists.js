// User playlists + share links. Storage is injected (localStorage in the browser, a plain object in tests). No audio, no DOM.
const KEY = "pv_playlists_v1";

export function browserStorage() {
  try { const s = window.localStorage; s.setItem("__t", "1"); s.removeItem("__t"); return s; }
  catch { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; }   // private mode: memory only
}

export function createPlaylistStore({ storage = browserStorage(), key = KEY, now = () => Date.now(), uid = () => Math.random().toString(36).slice(2, 10) } = {}) {
  const subs = new Set();
  let data = { version: 1, lists: [] };
  try { const raw = JSON.parse(storage.getItem(key) || "null"); if (raw && Array.isArray(raw.lists)) data = raw; } catch { /* corrupt → start empty */ }
  const save = () => { try { storage.setItem(key, JSON.stringify(data)); } catch { /* quota */ } subs.forEach((f) => f(data.lists)); };
  const find = (id) => data.lists.find((l) => l.id === id);
  const clean = (name) => String(name || "").trim().slice(0, 60) || "Untitled playlist";
  const touch = (l) => { l.updated = now(); save(); return l; };

  return {
    subscribe(f) { subs.add(f); return () => subs.delete(f); },
    list: () => data.lists.map((l) => ({ ...l, tracks: [...l.tracks] })),
    get: (id) => { const l = find(id); return l ? { ...l, tracks: [...l.tracks] } : null; },
    create(name, ids = []) { const l = { id: uid(), name: clean(name), created: now(), updated: now(), tracks: [...new Set(ids)] }; data.lists.push(l); save(); return l.id; },
    rename(id, name) { const l = find(id); if (l) { l.name = clean(name); touch(l); } },
    remove(id) { data.lists = data.lists.filter((l) => l.id !== id); save(); },
    /** Adds ids to a playlist; duplicates are skipped unless allowDuplicates. Returns how many were added. */
    add(id, ids, { allowDuplicates = false } = {}) {
      const l = find(id); if (!l) return 0; let n = 0;
      for (const t of ids) if (allowDuplicates || !l.tracks.includes(t)) { l.tracks.push(t); n++; }
      if (n) touch(l); return n;
    },
    removeAt(id, index) { const l = find(id); if (l && index >= 0 && index < l.tracks.length) { l.tracks.splice(index, 1); touch(l); } },
    move(id, from, to) { const l = find(id); if (!l || from === to || from < 0 || to < 0 || from >= l.tracks.length || to >= l.tracks.length) return; const [m] = l.tracks.splice(from, 1); l.tracks.splice(to, 0, m); touch(l); },
    /** Resolve against the catalogue; ids that no longer exist are reported, never crash. */
    resolve(id, catalog) { const l = find(id); return l ? catalog.resolve(l.tracks) : { found: [], missing: [] }; },
    exportJSON: () => JSON.stringify({ app: "phonkverse", version: 1, lists: data.lists }, null, 1),
    /** Import a backup. Returns {added, skipped}. Always creates new ids so nothing is overwritten. */
    importJSON(text) {
      let raw; try { raw = JSON.parse(text); } catch { return { added: 0, skipped: 0, error: "Not valid JSON" }; }
      if (!raw || raw.app !== "phonkverse" || !Array.isArray(raw.lists)) return { added: 0, skipped: 0, error: "Not a PHONKVERSE backup" };
      let added = 0, skipped = 0;
      for (const l of raw.lists) { if (l && Array.isArray(l.tracks) && l.tracks.every((t) => typeof t === "string")) { this.create(l.name, l.tracks); added++; } else skipped++; }
      return { added, skipped };
    },
  };
}

/* ---------- Share links (no backend): "<name>!album.01,03_album2.02" ---------- */
/** Consecutive tracks of the same album are grouped; order is preserved. */
export function encodeShare(name, ids) {
  const segs = [];
  for (const id of ids) { const [a, n] = id.split(":"); const last = segs[segs.length - 1]; if (last && last.a === a) last.n.push(n); else segs.push({ a, n: [n] }); }
  return `${encodeURIComponent(String(name || "Shared playlist").slice(0, 60))}!${segs.map((s) => `${s.a}.${s.n.join(",")}`).join("_")}`;
}
export function decodeShare(token, catalog) {
  try {
    const [rawName, body = ""] = String(token).split("!");
    const ids = []; for (const seg of body.split("_")) { const [a, ns = ""] = seg.split("."); for (const n of ns.split(",")) if (a && n) ids.push(`${a}:${n}`); }
    const { found, missing } = catalog.resolve([...new Set(ids)].slice(0, 200));
    return { name: decodeURIComponent(rawName) || "Shared playlist", ids: found.map((t) => t.id), missing };
  } catch { return { name: "Shared playlist", ids: [], missing: [] }; }
}
