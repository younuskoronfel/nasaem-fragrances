# Nasaem Fragrances

Source repository for the Nasaem Fragrances website.

## Contributing

1. Clone the repository and open it in Codex or your editor.
2. Start from the latest `main` and create a branch for your change.
3. Push your branch and open a pull request into `main` for review.

## Preview locally

Run `python3 -m http.server 8765` from the repository root and open `http://localhost:8765`. The site has no build step.

## Scent discovery

The three-question journey and ranking function live in `journey.js`. Questions and scoring are kept separate from the catalog and detail dialog, so a future conversational guide can return fragrance IDs and reuse the storefront. The current journey runs in the browser and saves no answers.

## Catalog and checkout

Edit the catalog in `scents.js`. The names and mood words are based on the campaign art. The mood filters are browsing categories. Add confirmed `size`, `notes`, `price` (including currency), and a provider-issued HTTPS `checkoutUrl` to each fragrance when ready. The checkout button appears when both price and checkout URL are present. Until then, fragrance details link to Instagram.

The site publishes through GitHub Pages. The source branch is selected in **Settings → Pages**, with `/ (root)` as the folder.

## Bottle sequence

The scroll sequence uses a local Three.js r180 bundle (MIT) and WebGL. The renderer loads near the exhibit. Visitors who prefer reduced motion or use a browser without WebGL can still select a fragrance and see its artwork and details.

`atelier-model.js` defines the bottle optics, lighting, and scroll poses. `atelier-packaging.js` builds the bag, hinged box, crown, and printed insert. `atelier-macro.js` handles the camera move through the droplet and the insert landing. The insert uses the selected fragrance’s 1080 × 1350 campaign artwork with Cormorant title lettering from `assets/atelier/cards/`. Keep the filenames in sync with `scents.js`; the smaller `assets/scents/` images serve the collection grid.

The hero’s silent 1080p loop and poster live in `assets/hero/`. `hero-film.js` pauses the video offscreen and respects reduced motion. `scroll-art.js` drives the video, light, and text parallax.
