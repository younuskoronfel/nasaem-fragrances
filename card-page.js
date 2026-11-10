const cardId = new URLSearchParams(location.search).get("scent");
const cardScent = scents.find(({ id }) => id === cardId);
if (cardScent) {
  const page = document.querySelector(".fragrance-layout");
  document.title = `${cardScent.name} — Nasaem Fragrances`;
  page.querySelector(".fragrance-name").textContent = cardScent.name;
  page.querySelector(".fragrance-identity").textContent =
    [t(cardScent.collection), scentText(cardScent, "mood")].join(" · ");
  page.querySelector(".fragrance-description").textContent = scentText(cardScent, "description");

  const notes = page.querySelector(".fragrance-notes dl");
  for (const [stage, value] of Object.entries(cardScent.notePyramid ?? {})) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = t(stage);
    description.textContent = translateNotes(value);
    row.append(term, description);
    notes.append(row);
  }

  const masculine = cardScent.collection === "Masculine";
  const bottle = page.querySelector(".fragrance-bottle");
  bottle.src = `assets/packaging/${masculine ? "onyx" : "amber"}-bottle.webp?v=reference-flacon-1`;
  bottle.alt = t(masculine ? "Black glass Nasaem bottle" : "Amber glass Nasaem bottle");

  // The backdrop sheet uses the same row-major order as the scent catalog.
  const tile = scents.indexOf(cardScent);
  page.querySelector(".fragrance-backdrop").style.backgroundPosition =
    `${tile % 4 * 100 / 3}% ${Math.floor(tile / 4) * 100 / 3}%`;

  const frame = page.querySelector(".fragrance-frame");
  const scene = frame.querySelector(".fragrance-scene");
  const artwork = frame.querySelector(".fragrance-art");
  artwork.alt = t("{name} campaign artwork", { name: cardScent.name });
  const toggle = page.querySelector(".fragrance-art-toggle");
  const status = page.querySelector(".fragrance-art-status");

  toggle.addEventListener("click", async () => {
    if (toggle.getAttribute("aria-busy") === "true") return;
    const showArtwork = toggle.getAttribute("aria-pressed") === "false";
    if (showArtwork && !artwork.naturalWidth) {
      toggle.setAttribute("aria-busy", "true");
      status.textContent = t("Loading artwork…");
      try {
        artwork.src = await cardArtworkURL(cardId, true);
        await artwork.decode();
      } catch {
        status.textContent = t("Artwork unavailable. Try again.");
        return;
      } finally {
        toggle.removeAttribute("aria-busy");
      }
    }
    status.textContent = "";
    toggle.setAttribute("aria-pressed", String(showArtwork));
    scene.setAttribute("aria-hidden", String(showArtwork));
    artwork.setAttribute("aria-hidden", String(!showArtwork));
    frame.classList.toggle("shows-artwork", showArtwork);
  });

  page.querySelector(".fragrance-explore").href = `./?scent=${encodeURIComponent(cardId)}#collection`;
  document.querySelector(".fragrance-unavailable").hidden = true;
  page.hidden = false;
}
