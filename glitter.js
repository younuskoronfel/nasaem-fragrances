const glitterMotion = matchMedia("(prefers-reduced-motion: no-preference)");
const dust = document.querySelector(".gold-dust");
const glintColors = ["#fff1cb", "#ffdb87", "#ffd0b6"];
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
    glitter.style.setProperty("--size", `${index % 3 === 0 ? 8 : 3 + Math.random() * 2}px`);
    glitter.style.setProperty("--time", `${5 + Math.random() * 5}s`);
    glitter.style.setProperty("--delay", `${-Math.random() * 9}s`);
    glitter.style.setProperty("--glint", glintColors[index % glintColors.length]);
    dust.append(glitter);
  }
}

function releaseGlitter() {
  if (glitterMotion.matches) scatterGlitter();
  else {
    dust.replaceChildren();
    for (const burst of bursts.splice(0)) burst.remove();
  }
}

releaseGlitter();
glitterMotion.addEventListener("change", releaseGlitter);

document.addEventListener("click", event => {
  if (!glitterMotion.matches || !event.isTrusted || !(event.target instanceof Element)) return;
  const button = event.target.closest('button, summary, [role="button"], input[type="submit"], a.button, a.film-scroll, a.text-link');
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
    for (let index = 0; index < 7; index++) {
      const glitter = document.createElement("span");
      const angle = rotation + index * Math.PI * 2 / 7;
      const distance = 20 + Math.random() * 23;
      glitter.className = "glitter";
      glitter.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
      glitter.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
      glitter.style.setProperty("--size", `${index % 3 === 0 ? 9 : 4}px`);
      glitter.style.setProperty("--time", `${400 + Math.random() * 190}ms`);
      glitter.style.setProperty("--glint", glintColors[index % glintColors.length]);
      burst.append(glitter);
    }

    bursts.push(burst);
    if (bursts.length > 4) bursts.shift().remove();
    setTimeout(() => {
      burst.remove();
      const index = bursts.indexOf(burst);
      if (index !== -1) bursts.splice(index, 1);
    }, 650);
  });
}, { capture: true });
