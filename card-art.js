// The original cards are three panels. Join their artwork at the trim lines,
// retaining the printed names, mood words and mark from the source.
const cardPrints = new Map();
const pendingCardImages = new WeakMap();
const lazyCardPrints = new IntersectionObserver(entries => {
  for (const { isIntersecting, target } of entries) {
    if (!isIntersecting) continue;
    lazyCardPrints.unobserve(target);
    const { id, full } = pendingCardImages.get(target);
    setCardArtwork(target, id, full);
  }
}, { rootMargin: "220px" });

function cardArtworkURL(id, full = false) {
  const path = full ? `assets/atelier/cards/${id}.jpg` : `assets/scents/${id}.webp`;
  if (!cardPrints.has(path)) {
    const print = (async () => {
      const response = await fetch(path);
      if (!response.ok) throw new Error("Campaign artwork could not load");
      const blob = await response.blob();
      const source = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      const [width, height] = full ? [1080, 1350] : [768, 960];
      const panels = full ? [[0, 433], [459, 891], [917, 1350]] : [[0, 307], [327, 633], [653, 960]];
      const printHeight = panels.reduce((sum, [start, end]) => sum + end - start, 0);
      let y = 0;
      const strips = panels.map(([start, end]) => {
        const size = end - start;
        const strip = `<svg y="${y}" width="${width}" height="${size}" viewBox="0 ${start} ${width} ${size}" overflow="hidden"><use href="#art"/></svg>`;
        y += size;
        return strip;
      }).join("");
      const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${printHeight}" preserveAspectRatio="none"><defs><image id="art" width="${width}" height="${height}" href="${source}"/></defs>${strips}</svg>`;
      return URL.createObjectURL(new Blob([sheet], { type: "image/svg+xml" }));
    })();
    print.catch(() => cardPrints.delete(path));
    cardPrints.set(path, print);
  }
  return cardPrints.get(path);
}

function setCardArtwork(image, id, full = false, lazy = false) {
  const request = { id, full };
  pendingCardImages.set(image, request);
  if (lazy) {
    lazyCardPrints.observe(image);
    return;
  }
  cardArtworkURL(id, full).then(url => {
    if (pendingCardImages.get(image) === request) image.src = url;
  }).catch(() => {
    if (pendingCardImages.get(image) === request) image.removeAttribute("src");
  });
}
