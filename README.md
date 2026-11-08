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

For GitHub Pages, choose **Deploy from a branch** in **Settings → Pages** and select `main` and `/ (root)` after merging the website.

## Bottle sequence

The unboxing and spray sequence uses a local Three.js r180 bundle (MIT) and WebGL. The renderer loads when the exhibit enters view. Browsers without WebGL and visitors who prefer reduced motion see the painted bottle instead. The chapter copy and collection link are ordinary HTML.

`atelier-model.js` defines the bottle optics, studio lighting, and scroll poses. `atelier-packaging.js` models the bag, hinged box, and crown from the supplied reference photos. `atelier.css` and `scroll-art.js` handle the page-wide art treatments.
