const glitterMotion = matchMedia("(prefers-reduced-motion: no-preference)");
const dust = document.querySelector(".gold-dust");
const glintColors = ["#fff7de", "#ffe098", "#ffd9cb"];
const bursts = [];
const dialogDust = [...document.querySelectorAll("dialog")].map(dialog => {
  const layer = document.createElement("div");
  layer.className = "gold-dust dialog-dust";
  layer.setAttribute("aria-hidden", "true");
  dialog.append(layer);
  return layer;
});

function scatterGlitter(layer, columns, rows) {
  for (let index = 0; index < columns * rows; index++) {
    const glitter = document.createElement("span");
    glitter.className = "glitter";
    glitter.style.setProperty("--left", `${((index % columns) + .18 + Math.random() * .64) / columns * 100}%`);
    glitter.style.setProperty("--top", `${(Math.floor(index / columns) + .24 + Math.random() * .64) / rows * 100}%`);
    glitter.style.setProperty("--dx", `${Math.random() * 64 - 32}px`);
    glitter.style.setProperty("--dy", `${-24 - Math.random() * 60}px`);
    glitter.style.setProperty("--size", `${index % 3 === 0 ? 10 : 3.5 + Math.random() * 2}px`);
    glitter.style.setProperty("--time", `${5 + Math.random() * 5}s`);
    glitter.style.setProperty("--delay", `${-Math.random() * 9}s`);
    glitter.style.setProperty("--glint", glintColors[index % glintColors.length]);
    layer.append(glitter);
  }
}

const visibleBands = new IntersectionObserver(entries => {
  for (const entry of entries) {
    entry.target.classList.toggle("is-visible", entry.isIntersecting);
  }
}, { rootMargin: "100px 0px" });

function fillPageGlitter() {
  if (!glitterMotion.matches) return;
  const bandHeight = parseFloat(getComputedStyle(dust).gridAutoRows);
  if (!bandHeight) return;
  const bandCount = Math.ceil(dust.clientHeight / bandHeight);

  while (dust.childElementCount > bandCount) {
    visibleBands.unobserve(dust.lastElementChild);
    dust.lastElementChild.remove();
  }
  while (dust.childElementCount < bandCount) {
    const band = document.createElement("div");
    band.className = "glitter-band";
    scatterGlitter(band, 6, 4);
    dust.append(band);
    visibleBands.observe(band);
  }
}

function releaseGlitter() {
  if (glitterMotion.matches) {
    fillPageGlitter();
    for (const layer of dialogDust) scatterGlitter(layer, 4, 3);
  } else {
    visibleBands.disconnect();
    dust.replaceChildren();
    for (const layer of dialogDust) layer.replaceChildren();
    for (const burst of bursts.splice(0)) burst.remove();
  }
}

releaseGlitter();
glitterMotion.addEventListener("change", releaseGlitter);
const glitterResize = new ResizeObserver(fillPageGlitter);
glitterResize.observe(dust);

document.addEventListener("click", event => {
  if (!glitterMotion.matches || !event.isTrusted || !(event.target instanceof Element)) return;
  const button = event.target.closest('button, summary, [role="button"], input[type="submit"], input[type=radio], a.button, a.film-scroll, a.text-link, .site-header nav a, .atelier-sequence a, a.atelier-next');
  if (!button || button.matches(':disabled, [aria-disabled="true"]')) return;

  const buttonRect = button.getBoundingClientRect();
  const x = event.detail ? event.clientX : buttonRect.left + buttonRect.width / 2;
  const y = event.detail ? event.clientY : buttonRect.top + buttonRect.height / 2;

  requestAnimationFrame(() => {
    if (!glitterMotion.matches) return;
    const burst = document.createElement("span");
    burst.className = "glitter-burst";
    burst.setAttribute("aria-hidden", "true");

    const supportsPopover = typeof burst.showPopover === "function";
    const dialog = supportsPopover ? null : button.closest("dialog[open]");
    const rect = dialog?.getBoundingClientRect();
    burst.style.left = `${rect ? x - rect.left + dialog.scrollLeft : x}px`;
    burst.style.top = `${rect ? y - rect.top + dialog.scrollTop : y}px`;
    if (supportsPopover) burst.setAttribute("popover", "manual");
    (dialog || document.body).append(burst);
    if (supportsPopover) burst.showPopover();

    const rotation = Math.random() * Math.PI;
    const particleCount = 12;
    for (let index = 0; index < particleCount; index++) {
      const glitter = document.createElement("span");
      const angle = rotation + index * Math.PI * 2 / particleCount;
      const distance = (index % 2 === 0 ? 35 : 21) + Math.random() * 24;
      glitter.className = "glitter";
      glitter.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
      glitter.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
      glitter.style.setProperty("--size", `${index % 3 === 0 ? 12 : 4 + Math.random() * 2}px`);
      glitter.style.setProperty("--time", `${460 + Math.random() * 200}ms`);
      glitter.style.setProperty("--glint", glintColors[index % glintColors.length]);
      burst.append(glitter);
    }

    bursts.push(burst);
    if (bursts.length > 4) bursts.shift().remove();
    setTimeout(() => {
      burst.remove();
      const index = bursts.indexOf(burst);
      if (index !== -1) bursts.splice(index, 1);
    }, 720);
  });
}, { capture: true });
