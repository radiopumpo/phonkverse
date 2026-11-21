# Music library & persistent player — architecture

Goal: user-centred playback (playlists by country/genre/voice, fully custom sets, in order or shuffle) that is **not tied to individual pages**.

## Layers (each testable on its own)
| Layer | File(s) | Status |
|---|---|---|
| Data | `js/tracks.js` (albums/tracks), `js/music/tags.js` (countries, genres, per-track overrides) | done |
| Catalogue | `js/music/catalog.js` — flat track list, ids `albumKey:NN`, facets by album/country/genre, search | done, tested |
| Queue engine | `js/music/queue.js` — order, shuffle, repeat off/all/one, play next, add, remove, reorder, serialize/restore | done, tested |
| Playlists | `js/music/playlists.js` — CRUD on ids only, reorder, export/import JSON, share links (`encodeShare`/`decodeShare`) | done, tested |
| Audio engine | `js/music/engine.js` — one `<audio>`, direct playback (no Web Audio on touch devices), Media Session, session restore, skips missing files | done, tested |
| Persistent shell | `js/shell/*` — soft navigation; player + audio never reload; real URLs preserved; hard-navigation fallback | done |
| UI | `js/ui/*`, `js/pages/*` — dock, now-playing view, queue, library tabs, track menu, playlists, share links | done |
| Integration | BGM already yields to any play (`phonkverse:track-play`). Globe pins "play this voice/country" | pins: next |

Run the tests: `node --test tests/music.test.mjs`

## Decisions
- **Ids, not filenames.** Playlists store `albumKey:NN`; renaming a title or file never breaks them. Missing ids are reported, never crash.
- **Facets are computed.** Adding a track or a country in the data makes it appear in every browse tab. Phonkhan tracks are tagged per country (India / Pakistan), so they list correctly.
- **Shuffle keeps the original list.** The queue holds a natural list plus a play-order permutation; toggling shuffle never changes the current track; "previous" works; no repeats until the queue ends.
- **Repeat-one:** a track that ends replays; pressing Next still moves on (and wraps at the end).
- **Storage:** browser only (`localStorage`, injected so it is testable). Export/import JSON for backup. No accounts, no tracking. Cross-device sync would need a backend (out of scope).
- **Share links without a backend:** `<name>!album.01,03_album2.02` in a URL parameter; unknown ids are dropped.
- **Why a shell with soft navigation** (not a pop-out window or per-page hand-off): only an unchanging document keeps one audio element alive across pages, gives gapless playback and keeps playing when the phone switches apps. Pages keep their real URLs and still work when opened directly. Cost: each page's scripts need mount/unmount hooks (the globe's WebGL scene is the main one).

## Open questions
- Genre tags beyond the ones supplied (Phonké, Phonkdon, Phonkhan) default to `phonk`; refine in `js/music/tags.js`.
- Brazil (`BR`) is already defined for Phonkada.
