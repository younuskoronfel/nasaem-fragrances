// The carousel's wrap, shortest turn and tapered arc follow the supplied Dish Orbit reference.
const wrapIndex = (index, size) => ((index % size) + size) % size;
const stepDirection = (from, to, size) => {
  const forward = wrapIndex(to - from, size);
  return forward <= size - forward ? 1 : -1;
};
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const tones = { bright: "#adba92", floral: "#d5a18e", warm: "#dfad77", deep: "#c3906c" };

function arcPath(start, end) {
  const outer = [], inner = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48;
    const angle = (start + (end - start) * t) * Math.PI / 180;
    const taper = 9 * Math.pow(Math.sin(Math.PI * t), .45);
    const point = radius => [280 + Math.cos(angle) * radius, 236 + Math.sin(angle) * radius].join(" ");
    outer.push(point(201 + taper));
    inner.unshift(point(201 - taper));
  }
  return "M" + outer.concat(inner).join("L") + "Z";
}

let gsapReady;
let motionReady;
function loadGsap() {
  gsapReady ??= import("./assets/vendor/gsap.js?v=3.15.1").then(module => module.gsap).catch(() => null);
  return gsapReady;
}
function loadMotion() {
  motionReady ??= import("./assets/vendor/motion.js").then(() => window.Motion?.animate).catch(() => null);
  return motionReady;
}

export function mountOrbit(root, scents, open) {
  const art = root.querySelector(".discovery-art");
  const image = art.querySelector("img");
  const name = root.querySelector(".discovery-name");
  const mood = root.querySelector(".discovery-mood");
  const edition = root.querySelector(".discovery-edition");
  const arc = root.querySelector(".discovery-arc");
  const accent = arc.querySelector("path");
  const readout = root.querySelector(".discovery-position");
  const strip = root.querySelector(".discovery-strip");
  const arrows = [...root.querySelectorAll("[data-discovery-step]")];
  let items, current, generation = 0, timeline, touch, ghost;

  function showCaption(scent) {
    name.textContent = scent.name;
    art.setAttribute("aria-label", t("Open {name}", { name: scent.name }));
    mood.textContent = scentText(scent, "mood");
    edition.textContent = t(scent.collection);
  }

  document.addEventListener("nasaem:language", () => {
    if (items?.[current]) showCaption(items[current]);
  });

  function show(index, direction, animate = true) {
    if (!items.length) return;
    const outgoing = animate && image.complete && image.naturalWidth ? image.currentSrc || image.src : "";
    current = wrapIndex(index, items.length);
    const scent = items[current];
    const nextFrame = ++generation;
    timeline?.kill();
    ghost?.remove();
    art.style.removeProperty("transform");
    art.style.removeProperty("opacity");
    name.style.removeProperty("transform");
    name.style.removeProperty("opacity");
    arc.style.removeProperty("transform");
    root.style.setProperty("--discovery-tone", tones[scent.family]);
    image.src = `assets/scents/${scent.id}.webp`;
    showCaption(scent);
    readout.textContent = `${current + 1} / ${items.length}`;
    for (const [position, button] of [...strip.children].entries()) {
      if (position === current) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    }
    const active = strip.children[current];
    strip.scrollLeft = active.offsetLeft - strip.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2;
    if (!animate || reduceMotion.matches) return;
    loadGsap().then(gsap => {
      if (!gsap || nextFrame !== generation || reduceMotion.matches) return;
      timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      if (outgoing) {
        ghost = new Image(768, 960);
        ghost.src = outgoing;
        ghost.className = "discovery-ghost";
        ghost.alt = "";
        ghost.setAttribute("aria-hidden", "true");
        art.after(ghost);
        const departing = ghost;
        timeline.to(departing, { x: -direction * 76, y: -36, rotation: -direction * 17, opacity: 0,
          duration: .32, onComplete: () => departing.remove() }, 0);
      }
      timeline.fromTo(art, { x: direction * 55, y: -24, rotation: direction * 13, opacity: .35 },
        { x: 0, y: 0, rotation: 0, opacity: 1, duration: .58, clearProps: "transform,opacity" }, 0);
      timeline.fromTo(arc, { rotation: direction * 20 }, { rotation: 0, duration: .76, clearProps: "transform" }, 0);
      timeline.fromTo(name, { x: -direction * 18, opacity: .45 },
        { x: 0, opacity: 1, duration: .38, clearProps: "transform,opacity" }, .04);
    });
  }

  function setScents(next) {
    const previousId = items?.[current]?.id;
    items = next;
    root.hidden = !items.length;
    if (!items.length) return;
    strip.replaceChildren(...items.map((scent, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "discovery-thumbnail";
      button.setAttribute("aria-label", scent.name);
      const thumbnail = new Image(48, 60);
      thumbnail.src = `assets/scents/${scent.id}.webp`;
      thumbnail.loading = "lazy";
      thumbnail.alt = "";
      button.append(thumbnail);
      button.addEventListener("click", () => {
        if (index !== current) show(index, stepDirection(current, index, items.length));
      });
      return button;
    }));
    arrows.forEach(button => { button.disabled = items.length < 2; });
    show(Math.max(0, items.findIndex(scent => scent.id === previousId)), 1, false);
  }

  function step(direction) {
    if (items.length > 1) show(current + direction, direction);
  }
  accent.setAttribute("d", arcPath(160, 352));
  arrows.forEach(button => button.addEventListener("click", () => step(Number(button.dataset.discoveryStep))));
  root.querySelector(".discovery-open").addEventListener("click", () => open(items[current], image));
  art.addEventListener("click", () => open(items[current], image));
  root.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key) || event.altKey || event.metaKey || event.ctrlKey) return;
    event.preventDefault();
    step(event.key === "ArrowRight" ? 1 : -1);
  });
  let swiped = false;
  art.addEventListener("pointerdown", event => {
    swiped = false;
    touch = event.pointerType === "touch" ? event.clientX : undefined;
  });
  art.addEventListener("pointercancel", () => { touch = undefined; });
  art.addEventListener("pointerup", event => {
    const distance = event.clientX - touch;
    touch = undefined;
    if (Math.abs(distance) < 40 || !Number.isFinite(distance)) return;
    swiped = true;
    step(distance < 0 ? 1 : -1);
  });
  art.addEventListener("click", event => {
    if (!swiped) return;
    swiped = false;
    event.stopImmediatePropagation();
  }, true);
  setScents(scents);
  if (!reduceMotion.matches) {
    const warmup = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      warmup.disconnect();
      if (reduceMotion.matches) return;
      loadMotion();
      loadGsap();
    }, { rootMargin: "400px" });
    warmup.observe(root);
  }
  return { setScents };
}

export async function transferArtwork(dialog, source, destination, reverse = false) {
  if (reduceMotion.matches || !source?.isConnected || !source.complete) return;
  const animate = await loadMotion();
  if (!animate || !dialog.open || !source.isConnected || reduceMotion.matches) return;
  const shelf = source.getBoundingClientRect();
  const studio = destination.getBoundingClientRect();
  if (!shelf.width || !shelf.height || shelf.bottom < 0 || shelf.top > innerHeight || !studio.width) return;
  const height = Math.min(studio.height * .85, studio.width * 1.10);
  const width = height * .8;
  const portrait = { width, height, left: studio.left + (studio.width - width) / 2, top: studio.top + (studio.height - height) / 2 };
  const from = reverse ? portrait : shelf;
  const to = reverse ? shelf : portrait;
  const copy = document.createElement("img");
  copy.className = "shelf-transfer";
  copy.src = source.currentSrc || source.src;
  copy.alt = "";
  copy.setAttribute("aria-hidden", "true");
  Object.assign(copy.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
  dialog.append(copy);
  dialog.classList.add("is-transferring");
  try {
    await animate(copy, {
      transform: ["none", `translate3d(${to.left - from.left}px,${to.top - from.top}px,0) scale(${to.width / from.width},${to.height / from.height})`],
      opacity: [1, 1, 0]
    }, { duration: reverse ? .29 : .43, ease: [.22, .8, .24, 1], times: [0, .72, 1] });
  } finally {
    copy.remove();
    if (!dialog.querySelector(".shelf-transfer")) dialog.classList.remove("is-transferring");
  }
}
