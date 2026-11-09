const glitterMotion = matchMedia("(prefers-reduced-motion: no-preference)");
const dust = document.querySelector(".gold-dust");
const glintColors = ["#fff7de", "#ffe098", "#ffd9cb"];
const bursts = [];

function scatterGlitter() {
  dust.replaceChildren();
  for (let index = 0; index < 24; index++) {
    const glitter = document.createElement("span");
    glitter.className = "glitter";
    glitter.style.setProperty("--left", `${((index % 6) + .18 + Math.random() * .64) / 6 * 100}%`);
    glitter.style.setProperty("--top", `${(Math.floor(index / 6) + .24 + Math.random() * .64) / 4 * 100}%`);
    glitter.style.setProperty("--dx", `${Math.random() * 64 - 32}px`);
    glitter.style.setProperty("--dy", `${-24 - Math.random() * 60}px`);
    glitter.style.setProperty("--size", `${index % 3 === 0 ? 10 : 3.5 + Math.random() * 2}px`);
    glitter.style.setProperty("--time", `${5 + Math.random() * 5}s`);
    glitter.style.setProperty("--delay", `${-Math.random() * 9}s`);
    glitter.style.setProperty("--glint", glintColors[index % glintColors.length]);
    dust.append(glitter);
  }
}

function placeGlitter() {
  const dialog = glitterMotion.matches && document.querySelector("dialog[open]");
  if (typeof dust.showPopover !== "function") {
    (dialog || document.body).append(dust);
    return;
  }
  if (dust.matches(":popover-open")) dust.hidePopover();
  if (dialog) {
    dust.setAttribute("popover", "manual");
    dust.showPopover();
  } else {
    dust.removeAttribute("popover");
  }
}

function releaseGlitter() {
  placeGlitter();
  if (glitterMotion.matches) scatterGlitter();
  else {
    dust.replaceChildren();
    for (const burst of bursts.splice(0)) burst.remove();
  }
}

releaseGlitter();
glitterMotion.addEventListener("change", releaseGlitter);
const dialogObserver = new MutationObserver(placeGlitter);
for (const dialog of document.querySelectorAll("dialog")) {
  dialogObserver.observe(dialog, { attributes: true, attributeFilter: ["open"] });
}

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
