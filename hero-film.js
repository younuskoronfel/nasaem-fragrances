const film = document.querySelector(".film-video");
const filmButton = document.querySelector(".film-control");
const motion = matchMedia("(prefers-reduced-motion: reduce)");
let onScreen = false;
let playbackChoice;

function updateFilm() {
  const play = onScreen && (playbackChoice ?? !motion.matches);
  if (!play) {
    film.pause();
    return;
  }
  if (!film.getAttribute("src")) film.src = film.dataset.src;
  film.muted = true;
  film.play().catch(() => {});
}

function updateFilmButton() {
  filmButton.setAttribute("aria-label", t(film.paused ? "Play film" : "Pause film"));
}
document.addEventListener("nasaem:language", updateFilmButton);
filmButton.hidden = false;
filmButton.addEventListener("click", () => {
  playbackChoice = film.paused;
  updateFilm();
});
film.addEventListener("play", updateFilmButton);
film.addEventListener("pause", updateFilmButton);
film.addEventListener("error", () => { filmButton.hidden = true; });
motion.addEventListener("change", () => {
  playbackChoice = undefined;
  updateFilm();
});

const filmVisibility = new IntersectionObserver(([entry]) => {
  onScreen = entry.isIntersecting;
  updateFilm();
}, { threshold: .08 });
filmVisibility.observe(film.closest(".film-hero"));
