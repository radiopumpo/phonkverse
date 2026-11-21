// "Context" = a playable group, written as a short string: all · album:KEY · country:CODE · genre:NAME · playlist:ID · ids:a:01,b:02
// The same string is used by buttons (data-ctx), the library UI and share links, so every place resolves groups identically.
export function contextIds(spec, { catalog, playlists }) {
  const i = String(spec).indexOf(":"), kind = i < 0 ? spec : spec.slice(0, i), v = i < 0 ? "" : spec.slice(i + 1), T = catalog.tracks;
  switch (kind) {
    case "all": return T.map((t) => t.id);
    case "album": return T.filter((t) => t.albumKey === v).map((t) => t.id);
    case "country": return T.filter((t) => t.countries.includes(v)).map((t) => t.id);
    case "genre": return T.filter((t) => t.genres.includes(v)).map((t) => t.id);
    case "playlist": return (playlists.get(v)?.tracks || []).filter((id) => catalog.has(id));
    case "ids": return v.split(",").filter((id) => catalog.has(id));
    default: return [];
  }
}
