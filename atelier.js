const exhibit = document.querySelector(".atelier");
const stage = exhibit.querySelector(".atelier-stage");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

let loading = false;
let stop;

const nearExhibit = new IntersectionObserver(async ([entry]) => {
  if (!entry.isIntersecting || reducedMotion.matches || loading || stop) return;
  loading = true;
  stage.classList.add("is-preparing");
  nearExhibit.unobserve(exhibit);
  try {
    const { mountBottle } = await import("./atelier-model.js?v=gallery-fit-1");
    if (!reducedMotion.matches) stop = mountBottle(exhibit, stage);
  } catch {
    exhibit.classList.add("is-static");
  } finally {
    loading = false;
    if (!stop) stage.classList.remove("is-preparing");
  }
}, { rootMargin: `${Math.round(innerHeight * 2)}px 0px` });

nearExhibit.observe(exhibit);
reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) {
    stop?.();
    stop = undefined;
    stage.classList.remove("is-preparing");
  } else {
    nearExhibit.observe(exhibit);
  }
});
