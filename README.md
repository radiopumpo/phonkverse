# PHONKVERSE — static site (GitHub Pages)

Mobile-friendly static site, no build step. Serve over **http(s)** (VS Code Live Server, `python3 -m http.server`, or GitHub Pages) — ES modules do not load from `file://`.

## Pages
| File | Purpose |
|---|---|
| `index.html` | Home: scroll-driven hero with the live WebGL globe, ecosystem pillars, album cards, community banner |
| `phonkita.html` / `phonkazo.html` | Album pages with tracklists (▶ plays inline, title opens the song page) |
| `song.html` | One shared song page: `song.html?a=phonkita&t=03` — synthwave animation, timeline, prev/next, share |

## Folder map
```
assets/
  audio/phonkversebgm.mp3        background music (you upload this)
  songs/phonkita/NN-slug.mp3     album tracks (see naming below)
  songs/phonkazo/NN-slug.mp3
  globe/                         earth textures: night 4K, city lights 2K, clouds 1K
  images/                        hero art, album boards, radiopumpo-logo.jpg
css/style.css                    site-wide styles (+ world stage, BGM toggle, "Powered by")
css/song.css                     song page only
js/main.js                       mobile menu
js/player.js                     inline ▶ player on album pages
js/bgm.js                        background music (see below)
js/tracks.js                     song data used by song.html
js/globe/                        globe modules (see below)
js/song/                         song page modules
vendor/three.module.min.js       three.js r164, self-hosted
```

## Adding music
Tracks are MP3, named `NN-slug.mp3` — two digits, lowercase, hyphens, no spaces or accents (accents/apostrophes are dropped: "Dall’Italia" → `dallitalia`). GitHub Pages is case-sensitive.

Expected files:
- `assets/songs/phonkita/`: `01-ultimo-treno`, `02-affitto-killer`, `03-nord-sud`, `04-bella-figura`, `05-piazza-senza-padroni`, `06-sotto-la-pelle`, `07-dallitalia-alla-spagna`
- `assets/songs/phonkazo/`: `01-phonkazo-chollazo`, `02-manual-del-pelotazo`, `03-ni-de-tu-bando`, `04-curriculum-de-fantasma`, `05-la-penultima-terraza`, `06-nadie-nos-regalo-nada`, `07-de-espana-al-mundo`

A missing file shows a note with the expected path instead of failing silently.

**Adding or renaming a track:** edit it in `js/tracks.js` (song page) **and** in the album HTML (`track-row`, including its `data-src` and the `song.html?a=…&t=…` link). The two lists are not yet merged.

## Globe (`js/globe/`)
`config.js` content + tunables (POIs, signals, arcs, speed, zoom) · `geo.js` lat/lon maths · `earth.js` night-Earth shader, clouds, atmosphere · `network.js` signal nodes + animated arcs · `markers.js` clickable POIs as DOM buttons · `controls.js` drag, inertia, auto-rotate, focus-on-pin · `ui.js` POI card, HUD, buttons · `scroll.js` publishes scroll progress as CSS `--p` · `index.js` bootstrap.

- **Add a POI:** add one object to `LOCATIONS` in `config.js`.
- **Auto-rotate** always resumes ~2 s after the last interaction and pauses while a POI card is open. Plain mouse wheel scrolls the page; Ctrl/⌘+wheel, pinch on trackpads, or the +/− buttons zoom.
- **Touch:** horizontal swipe rotates, vertical swipe scrolls the page.
- **Reduced motion:** rotation slows to 30% (there is a pause button).
- **Better textures:** replace the files in `assets/globe/` (e.g. an 8K night map) and update paths in `config.js`.
- If WebGL is unavailable, a static image is shown instead.

## Coming-soon chapters
`js/upcoming.js` is the single list (Phonkami/Japan, Phonkada/Brazil, Phonké/France). Each entry renders a card in the home page's "More voices. Coming soon." section (`js/coming-soon.js`) and, if it has `lat`/`lon`, a dimmed "· SOON" pin on the globe (no link). To add a chapter: add one object. To launch it: move it into `LOCATIONS` (`js/globe/config.js`) and `js/tracks.js`, and add its album page.

## Song page (`js/song/`)
`index.js` page logic (reads `js/tracks.js`, URL params, share, Media Session) · `audio.js` playback + audio analyser · `visual.js` synthwave canvas scene. Share uses the native share sheet where available, otherwise copies the link. Link previews are generic (static hosting cannot vary meta tags per song).

## Background music (`js/bgm.js`)
- Loops `assets/audio/phonkversebgm.mp3` at low volume (`BGM` object at the top of the file: path, volume, fades).
- Browsers block autoplay with sound, so it starts on the first tap/click/key if needed.
- Any track played (album page ▶ or song page) fires `phonkverse:track-play`, which fades the BGM out for the rest of the visit. A page **refresh** brings it back; moving between pages does not restart it.
- Volume goes through Web Audio because iOS ignores `audio.volume`.
- A ♪ button in the header mutes/unmutes (choice is remembered per tab session).

## "Powered by" badge
Slim strip above the header on every page, linking to radiopumpo.github.io. Markup is in each HTML file (`.powered-bar`); logo at `assets/images/radiopumpo-logo.jpg`.

## Deploy to GitHub Pages
1. Upload the folder contents to the repo root.
2. Settings → Pages → Deploy from a branch → `main` / `/ (root)`.
3. After changing CSS/JS, hard-refresh (or bump the `?v=` query on the stylesheet links) — Safari caches aggressively.

## Known notes / next steps
- The hero characters are masked crops of one baked artwork (`home-hero-reference.webp`); separated character layers and a real brush-style wordmark SVG would improve fidelity.
- `css/style.css` still contains some older hero/globe rules that are no longer used; safe to prune later.
- Community/account features are presentation-only and would need a backend.
- Replace generated concept images with final approved artwork when available.
