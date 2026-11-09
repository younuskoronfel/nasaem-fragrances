const collection = document.querySelector("#scents");
const filters = document.querySelector(".filters");
const count = document.querySelector(".count");
const dialog = document.querySelector(".scent-dialog");
const familyNames = { bright: "Bright & fresh", floral: "Soft & floral", warm: "Warm & sweet", deep: "Deep & smoky" };
const arrows = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M5 12h13m-5-5 5 5-5 5"/></svg>';

function createCard(scent, index) {
  const article = document.createElement("article");
  article.className = "scent-card";
  article.dataset.family = scent.family;
  article.innerHTML = `
    <button class="card-button" type="button" aria-haspopup="dialog">
      <span class="card-art"><img width="768" height="960" alt="" loading="lazy" decoding="async"></span>
      <span class="card-text"><strong></strong><span class="card-mood"></span><span class="card-arrow">${arrows}</span></span>
    </button>`;
  const art = article.querySelector("img");
  setCardArtwork(art, scent.id, false, true);
  article.querySelector("strong").textContent = scent.name;
  article.querySelector(".card-mood").textContent = scentText(scent, "mood");
  article.querySelector("button").addEventListener("click", () => openScent(scent, art));
  return article;
}

let visibleScents = scents;
let discovery;
let collectionMotion;
const cards = scents.map(createCard);
// Finish laying out the carousel before the shelf becomes clickable.
import("./collection-motion.js?v=card-art-1").then(module => {
  collectionMotion = module;
  discovery = module.mountOrbit(document.querySelector(".scent-discovery"), visibleScents, openScent);
}).catch(() => {}).finally(() => {
  collection.append(...cards);
  filters.hidden = false;
  showScentCount();
});

function showScentCount() {
  const total = visibleScents.length;
  count.textContent = t(total === 1 ? "{count} fragrance" : "{count} fragrances", { count: total });
}

filters.addEventListener("click", event => {
  const chosen = event.target.closest("button");
  if (!chosen || chosen.getAttribute("aria-pressed") === "true") return;
  const mood = chosen.dataset.filter;
  for (const button of filters.querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(button === chosen));
  }
  visibleScents = [];
  for (const [index, scent] of scents.entries()) {
    const matches = mood === "all" || scent.family === mood;
    cards[index].hidden = !matches;
    if (matches) visibleScents.push(scent);
  }
  showScentCount();
  discovery?.setScents(visibleScents);
  collection.classList.remove("updated");
  requestAnimationFrame(() => requestAnimationFrame(() => collection.classList.add("updated")));
});

function setOptional(selector, value) {
  const element = dialog.querySelector(selector);
  element.textContent = value || "";
  element.hidden = !value;
}

function fillNotes(list, pyramid) {
  for (const [stage, value] of Object.entries(pyramid ?? {})) {
    const term = document.createElement("dt");
    const notes = document.createElement("dd");
    term.textContent = t(stage);
    notes.textContent = translateNotes(value);
    list.append(term, notes);
  }
}

const atelier = document.querySelector(".atelier");
const atelierControls = atelier.querySelector(".atelier-controls");
const packagingButtons = atelierControls.querySelectorAll("button[data-packaging]");
const scentSelect = atelierControls.querySelector(".atelier-scent");
const featuredChapter = atelier.querySelector("#bottle-notes");
const featuredTitle = featuredChapter.querySelector("h3");
const featuredMood = featuredChapter.querySelector(".atelier-mood");
const featuredNotes = featuredChapter.querySelector(".atelier-notes");
const featuredLiner = featuredChapter.querySelector(".atelier-liner");
const featuredDetail = featuredChapter.querySelector(".atelier-detail");
const scentPreview = dialog.querySelector(".scent-preview");
const viewer = dialog.querySelector(".scent-viewer");
const sprayButton = dialog.querySelector(".scent-spray");
const reveal = dialog.querySelector(".scent-reveal");
const scentMotion = matchMedia("(prefers-reduced-motion: reduce)");
let studio;
let session = 0;
const selectedScents = { brown: "golden-hour-bloom", black: "midnight-spice" };
let featuredScent;
let inspectedScent;
let inspectedArtwork;
let scentOpener;
let closingStudio = false;

function showFeaturedScent() {
  const packaging = atelier.dataset.packaging;
  featuredScent = scents.find(scent => scent.id === scentSelect.value);
  selectedScents[packaging] = featuredScent.id;
  atelier.dataset.scent = featuredScent.id;
  atelier.featuredScent = featuredScent;
  featuredChapter.querySelector(".atelier-orbit-guide").hidden = !featuredScent.notePyramid;
  featuredTitle.textContent = `${featuredScent.name}.`;
  showFeaturedCopy();
  featuredNotes.hidden = !featuredScent.notePyramid;
  setCardArtwork(featuredLiner, featuredScent.id, true);
  atelier.dispatchEvent(new CustomEvent("atelier:scent", {
    detail: { masculine: packaging === "black", scent: featuredScent }
  }));
}

function showFeaturedCopy() {
  featuredMood.textContent = scentText(featuredScent, "mood");
  featuredLiner.alt = t("{name} campaign card", { name: featuredScent.name });
  featuredNotes.replaceChildren();
  fillNotes(featuredNotes, featuredScent.notePyramid);
}

function showAtelierPackaging(packaging) {
  atelier.dataset.packaging = packaging;
  const classification = packaging === "black" ? "Masculine" : "Feminine";
  for (const button of packagingButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.packaging === packaging));
  }
  scentSelect.replaceChildren(...scents
    .filter(scent => scent.collection === classification)
    .map(scent => new Option(scent.name, scent.id)));
  scentSelect.value = selectedScents[packaging];
  showFeaturedScent();
}

for (const button of packagingButtons) {
  button.addEventListener("click", () => {
    if (button.dataset.packaging !== atelier.dataset.packaging) {
      showAtelierPackaging(button.dataset.packaging);
    }
  });
}
scentSelect.addEventListener("change", showFeaturedScent);
featuredDetail.addEventListener("click", () => openScent(featuredScent));
showAtelierPackaging(atelier.dataset.packaging);
atelierControls.hidden = false;
featuredDetail.hidden = false;

scentPreview.addEventListener("click", () => {
  const packaging = inspectedScent.collection === "Masculine" ? "black" : "brown";
  selectedScents[packaging] = inspectedScent.id;
  showAtelierPackaging(packaging);
  dialog.close();
  const destination = atelier.querySelector("#bottle-form");
  destination.focus({ preventScroll: true });
  destination.scrollIntoView({ block: "start" });
});

let sprayCopy = "Spray me";
function labelSpray(key) {
  sprayCopy = key;
  sprayButton.textContent = t(key);
}

function showScentNotes() {
  viewer.classList.toggle("has-campaign-reveal", !inspectedScent.notePyramid);
  reveal.hidden = false;
  sprayButton.disabled = false;
  labelSpray(studio ? "Spray again" : "View scent notes");
}

function useStillStudio() {
  studio?.dispose();
  studio = undefined;
  sprayButton.disabled = false;
  labelSpray("View scent notes");
}

async function loadStudio(scent, current) {
  if (scentMotion.matches) return useStillStudio();
  try {
    const { mountScentStudio } = await import("./atelier-model.js?v=card-art-1");
    if (session !== current || !dialog.open || scentMotion.matches) return;
    studio = mountScentStudio(viewer, scent, showScentNotes, () => {
      if (session !== current || !dialog.open) return;
      const shouldReveal = sprayButton.disabled;
      useStillStudio();
      if (shouldReveal) showScentNotes();
    });
    labelSpray("Spray me");
  } catch {
    if (session === current) useStillStudio();
  }
}

sprayButton.addEventListener("click", () => {
  if (!studio) return showScentNotes();
  viewer.classList.remove("has-campaign-reveal");
  reveal.hidden = true;
  sprayButton.disabled = true;
  labelSpray("Spraying");
  studio.spray();
});
viewer.querySelectorAll("[data-turn]").forEach(button => {
  button.addEventListener("click", () => studio?.rotate(Number(button.dataset.turn) * .42));
});
dialog.addEventListener("close", () => {
  if (dialog.open) return;
  session++;
  studio?.dispose();
  studio = undefined;
});
scentMotion.addEventListener("change", () => {
  if (!dialog.open || !scentMotion.matches) return;
  const shouldReveal = sprayButton.disabled;
  useStillStudio();
  if (shouldReveal) showScentNotes();
});

function openScent(scent, source) {
  scentOpener = document.activeElement;
  inspectedScent = scent;
  updateAvailability();
  inspectedArtwork = source;
  closingStudio = false;
  const current = ++session;
  studio?.dispose();
  studio = undefined;
  viewer.classList.remove("has-campaign-reveal");
  reveal.hidden = true;
  sprayButton.disabled = false;
  labelSpray(scentMotion.matches ? "View scent notes" : "Spray me");
  const art = dialog.querySelector(".scent-art");
  art.removeAttribute("src");
  setCardArtwork(art, scent.id);
  updateScentCopy(scent);
  setOptional(".checkout-note", "");
  dialog.querySelector(".scent-packaging").open = false;
  dialog.showModal();
  dialog.scrollTop = 0;
  if (source) collectionMotion?.transferArtwork(dialog, source, viewer).catch(() => {});
  loadStudio(scent, current);
}

dialog.querySelector(".scent-packaging").addEventListener("toggle", event => {
  if (event.target.open) renderPackaging(event.target.querySelector(".cart-photos"), inspectedScent);
});

function updateScentCartLink() {
  dialog.querySelector(".scent-cart-link").hidden = !cartQuantity(inspectedScent.id);
}

dialog.querySelector(".scent-action").addEventListener("click", () => {
  const added = addToCart(inspectedScent.id);
  packagingSelection = inspectedScent.id;
  updateScentCartLink();
  setOptional(".checkout-note", t(added ? "{name} added to your cart." : "This fragrance has reached the cart quantity limit.", { name: inspectedScent.name }));
});

dialog.querySelector(".scent-cart-link").addEventListener("click", () => {
  dialog.close();
  openCart(scentOpener);
});

async function closeScent() {
  if (closingStudio) return;
  closingStudio = true;
  const current = session;
  try {
    await collectionMotion?.transferArtwork(dialog, inspectedArtwork, viewer, true);
  } catch {
    // The native close still works if the shared animation is interrupted.
  } finally {
    if (dialog.open && session === current) dialog.close();
    closingStudio = false;
  }
}
dialog.querySelector(".close").addEventListener("click", closeScent);
dialog.addEventListener("cancel", event => {
  event.preventDefault();
  closeScent();
});
dialog.addEventListener("click", event => {
  if (event.target === dialog) closeScent();
});

function updateScentCopy(scent) {
  dialog.querySelector(".scent-art").alt = t("{name} campaign artwork", { name: scent.name });
  dialog.querySelector("#scent-title").textContent = scent.name;
  dialog.querySelector(".scent-family").textContent = [scent.collection, familyNames[scent.family]].filter(Boolean).map(value => t(value)).join(" · ");
  dialog.querySelector(".scent-mood").textContent = scentText(scent, "mood");
  dialog.querySelector(".scent-description").textContent = scentText(scent, "description");
  setOptional(".scent-format", [scent.size, scent.notes].filter(Boolean).join(" · "));
  setOptional(".scent-price", scent.price);
  const noteList = dialog.querySelector(".scent-notes");
  noteList.replaceChildren();
  noteList.hidden = !scent.notePyramid;
  fillNotes(noteList, scent.notePyramid);
  setOptional(".scent-note-status", scent.notePyramid ? "" : t("Ask us for this fragrance’s note list."));

  updateScentCartLink();
  if (dialog.querySelector(".scent-packaging").open) renderPackaging(dialog.querySelector(".cart-photos"), scent);
}

addEventListener("storage", event => {
  if (dialog.open && (event.key === cartStorageKey || event.key === null)) updateScentCartLink();
});

document.addEventListener("nasaem:language", () => {
  cards.forEach((card, index) => {
    card.querySelector(".card-mood").textContent = scentText(scents[index], "mood");
  });
  showScentCount();
  showFeaturedCopy();
  if (dialog.open) {
    labelSpray(sprayCopy);
    updateScentCopy(inspectedScent);
    setOptional(".checkout-note", "");
  }
});

function updateAvailability() {
  const soldOut = isScentSoldOut(inspectedScent?.id);
  dialog.querySelector(".scent-action").hidden = soldOut;
  dialog.querySelector(".scent-availability").hidden = !soldOut;
  dialog.querySelector(".scent-watch").hidden = !soldOut;
}

document.addEventListener("nasaem:availability", updateAvailability);
dialog.querySelector(".scent-watch").addEventListener("click", () => {
  dialog.close();
  openAccount(scentOpener, inspectedScent.id);
});
