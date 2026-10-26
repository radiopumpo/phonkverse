# PHONKVERSE static website POC

Three-page, mobile-friendly static site for GitHub Pages:
- `index.html` — homepage, rotating globe effect, five ecosystem pillars, two album cards
- `phonkita.html` — Italian movement album page
- `phonkazo.html` — Spanish movement album page

## Preview locally
Open `index.html` in a browser. For best results, use a local static server, e.g. VS Code Live Server.

## Deploy to GitHub Pages
1. Create or open a repository.
2. Upload the contents of this folder to the repository root.
3. In GitHub, open Settings → Pages.
4. Choose Deploy from a branch, select `main` and `/ (root)`, then save.
5. Wait for the deployment URL to appear.

## Before public launch
- Replace generated concept images with final approved artwork if needed.
- Add official listening links to track buttons.
- The homepage hero now uses the cinematic concept artwork as its visual target, with responsive invisible click areas over the hero calls to action. This is an image-led visual POC, not a live 3D geographic globe yet.
- Community/account features are presentation-only and would require a backend for real shared data.
- Google Fonts are optional; system fonts remain as fallbacks.


## Interactive globe experience

The homepage now includes a scroll-driven world stage and a WebGL globe powered by Three.js (loaded from jsDelivr). The globe can be dragged to rotate, zoomed with the wheel or on-screen controls, and has clickable Italy, Spain and global-map pins. Scroll progress moves the Phonkita and Phonkazo information panels outward and grows the globe. The remainder of the existing albums, ecosystem and community sections follows below.

Note: the side panels are HTML components; the original hero illustration is not cut into independently movable character layers. This avoids rough image cut-outs while establishing the intended scroll interaction. The globe is a stylized interactive 3D globe/grid, with movement pins; a real terrain texture and user-generated map data can be added in a later iteration.
