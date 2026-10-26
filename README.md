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
- The globe is a CSS-rendered visual effect, not a geographic data globe yet; this keeps the POC fast and dependency-free.
- Community/account features are presentation-only and would require a backend for real shared data.
- Google Fonts are optional; system fonts remain as fallbacks.
