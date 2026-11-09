const exhibit = document.querySelector(".atelier");
const stage = exhibit.querySelector(".atelier-stage");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

let loading = false;
let stop;

const nearExhibit = new IntersectionObserver(async ([entry]) => {
  if (!entry.isIntersecting || reducedMotion.matches || loading || stop) return;
  loading = true;
  nearExhibit.unobserve(exhibit);
  try {
    const { mountBottle } = await import("./atelier-model.js?v=citrus-lens-1");
    if (!reducedMotion.matches) stop = mountBottle(exhibit, stage);
  } catch {
    exhibit.classList.add("is-static");
  } finally {
    loading = false;
  }
}, { rootMargin: "180px 0px", threshold: .01 });

nearExhibit.observe(exhibit);
reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) {
    stop?.();
    stop = undefined;
  } else {
    nearExhibit.observe(exhibit);
  }
});
