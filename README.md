# Nasaem Fragrances

[![A gold-crowned Nasaem fragrance bottle in warm studio light](assets/hero/nasaem-poster.webp)](https://younuskoronfel.github.io/nasaem-fragrances/)

An interactive site for Nasaem Fragrances. Explore 16 fragrances, find a scent by mood, or follow the scroll-driven unboxing from the first spray to the printed scent card.

[**Visit the live site**](https://younuskoronfel.github.io/nasaem-fragrances/) · [Explore the collection](https://younuskoronfel.github.io/nasaem-fragrances/#collection) · [Instagram](https://www.instagram.com/nasaem.fragrances/)

## Run locally

From the repository root, run:

```sh
python3 -m http.server 8765
```

Open [localhost:8765](http://localhost:8765/). The site uses static HTML, CSS, and JavaScript with no install or build step.

## Find your way around

| File or directory | What it contains |
| --- | --- |
| [`scents.js`](scents.js) | Fragrance names, collections, moods, descriptions, and confirmed top, heart, and base notes |
| [`store.js`](store.js) and [`collection-motion.js`](collection-motion.js) | Collection filters, carousel, and fragrance detail dialog |
| [`journey.js`](journey.js) | Three-question scent finder and recommendation scoring |
| [`atelier-model.js`](atelier-model.js), [`atelier-macro.js`](atelier-macro.js), and [`scent-orbit.js`](scent-orbit.js) | Three.js bottle, scroll sequence, droplet reveal, and animated scent notes |
| [`assets/scents/`](assets/scents/) and [`assets/atelier/cards/`](assets/atelier/cards/) | Collection artwork and full-resolution inserts, named by fragrance ID |

Fragrance details currently send ordering inquiries to Instagram. To enable checkout for a fragrance, add its confirmed price with currency and the payment provider’s HTTPS checkout URL in `scents.js`.

## Contribute and publish

Branch from `main` and open a pull request back into `main`. For storefront changes, check the affected flow on desktop and mobile. For animation changes, also check reduced motion and the static artwork fallback.

GitHub Pages serves the root of `nasaem/website`. After review, fast-forward that branch to the approved `main` commit to publish. The [custom-domain branch](https://github.com/younuskoronfel/nasaem-fragrances/tree/nasaem/custom-domain) stages the switch to `nasaemfragrances.com` for when the domain is registered and ready to connect.
