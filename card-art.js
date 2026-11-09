// The printed rules cover part of the painting. Overlap the adjacent artwork
// at each join and feather it without changing the printed lettering.
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
      const feather = full ? 36 : 26;
      const margin = feather * 2;
      const fades = [];
      let y = 0;
      const strips = panels.map(([start, end], index) => {
        const size = end - start;
        const hasTop = index > 0;
        const hasBottom = index < panels.length - 1;
        const top = hasTop ? margin : 0;
        const bottom = hasBottom ? margin : 0;
        const piece = (sourceY, sourceHeight, targetY, targetHeight, name) => {
          const scale = targetHeight / sourceHeight;
          const clip = `panel-${index}-${name}`;
          fades.push(`<clipPath id="${clip}"><rect x="0" y="${targetY - 1}" width="${width}" height="${targetHeight + 2}"/></clipPath>`);
          return `<g clip-path="url(#${clip})"><use href="#art" transform="translate(0 ${targetY - sourceY * scale}) scale(1 ${scale})"/></g>`;
        };
        const core = piece(start + top, size - top - bottom, y + top, size - top - bottom, "core");
        const upper = hasTop ? piece(start, margin, y - feather, margin + feather, "upper") : "";
        const lower = hasBottom ? piece(end - margin, margin, y + size - margin, margin + feather, "lower") : "";
        let mask = "";
        if (hasTop) {
          fades.push(`<linearGradient id="fade-${index}" gradientUnits="userSpaceOnUse" x1="0" y1="${y - feather}" x2="0" y2="${y + feather}"><stop stop-color="black"/><stop offset=".22" stop-color="#202020"/><stop offset=".78" stop-color="#dfdfdf"/><stop offset="1" stop-color="white"/></linearGradient><mask id="join-${index}" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${printHeight}"><rect y="${y - feather}" width="${width}" height="${printHeight}" fill="url(#fade-${index})"/></mask>`);
          mask = ` mask="url(#join-${index})"`;
        }
        y += size;
        return `<g${mask}>${upper}${core}${lower}</g>`;
      }).join("");
      const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${printHeight}" preserveAspectRatio="none"><defs><image id="art" width="${width}" height="${height}" href="${source}"/>${fades.join("")}</defs>${strips}</svg>`;
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
