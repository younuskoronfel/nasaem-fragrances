const scrollMotion = matchMedia("(prefers-reduced-motion: no-preference)");
const scrollScenes = [...document.querySelectorAll(".film-hero, .about-nasaem, .journey, .atelier, .collection, .guide, .contact")];
const visibleScenes = new Set();
let scrollFrame = 0;

function paintScroll() {
  scrollFrame = 0;
  if (!scrollMotion.matches) return;
  for (const scene of visibleScenes) {
    const bounds = scene.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, (innerHeight - bounds.top) / (innerHeight + bounds.height)));
    scene.style.setProperty("--scroll-art", progress.toFixed(4));
  }
}

function scheduleScrollArt() {
  if (!scrollFrame && visibleScenes.size) scrollFrame = requestAnimationFrame(paintScroll);
}

const sceneObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.isIntersecting) visibleScenes.add(entry.target);
    else visibleScenes.delete(entry.target);
  }
  scheduleScrollArt();
});
scrollScenes.forEach(scene => sceneObserver.observe(scene));
addEventListener("scroll", scheduleScrollArt, { passive: true });
addEventListener("resize", scheduleScrollArt, { passive: true });

const gallery = document.querySelector(".scent-grid");
gallery.addEventListener("pointermove", event => {
  const art = event.target.closest(".card-art");
  if (!art || event.pointerType === "touch" || !scrollMotion.matches) return;
  const rect = art.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  art.style.setProperty("--light-x", `${x * 100}%`);
  art.style.setProperty("--light-y", `${y * 100}%`);
  art.style.setProperty("--tilt-x", `${(.5 - y) * 5}deg`);
  art.style.setProperty("--tilt-y", `${(x - .5) * 6}deg`);
});
