const collection = document.querySelector("#scents");
const filters = document.querySelector(".filters");
const count = document.querySelector(".count");
const dialog = document.querySelector(".scent-dialog");
const familyNames = Object.fromEntries(
  [...filters.querySelectorAll("[data-filter]")].map(button => [button.dataset.filter, button.textContent])
);
const arrows = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M5 12h13m-5-5 5 5-5 5"/></svg>';
const messageUrl = "https://ig.me/m/nasaem.fragrances";

function createCard(scent, index) {
  const article = document.createElement("article");
  article.className = "scent-card";
  article.dataset.family = scent.family;
  article.innerHTML = `
    <button class="card-button" type="button" aria-haspopup="dialog">
      <span class="card-art"><img width="768" height="960" alt="" decoding="async" src="assets/scents/${scent.id}.webp"></span>
      <span class="card-text"><strong></strong><span class="card-mood"></span><span class="card-arrow">${arrows}</span></span>
    </button>`;
  const art = article.querySelector("img");
  art.loading = index < 4 ? "eager" : "lazy";
  article.querySelector("strong").textContent = scent.name;
  article.querySelector(".card-mood").textContent = scent.mood;
  article.querySelector("button").addEventListener("click", () => openScent(scent));
  return article;
}

const cards = scents.map(createCard);
collection.append(...cards);
filters.hidden = false;
count.textContent = `${scents.length} fragrances`;

filters.addEventListener("click", event => {
  const chosen = event.target.closest("button");
  if (!chosen || chosen.getAttribute("aria-pressed") === "true") return;
  const mood = chosen.dataset.filter;
  for (const button of filters.querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(button === chosen));
  }
  let visible = 0;
  for (const [index, scent] of scents.entries()) {
    const matches = mood === "all" || scent.family === mood;
    cards[index].hidden = !matches;
    if (matches) visible++;
  }
  count.textContent = `${visible} fragrances`;
  collection.classList.remove("updated");
  requestAnimationFrame(() => requestAnimationFrame(() => collection.classList.add("updated")));
});

function setOptional(selector, value) {
  const element = dialog.querySelector(selector);
  element.textContent = value || "";
  element.hidden = !value;
}

function openScent(scent) {
  const art = dialog.querySelector(".scent-art");
  art.src = `assets/scents/${scent.id}.webp`;
  art.alt = `${scent.name} campaign artwork`;
  dialog.querySelector("#scent-title").textContent = scent.name;
  dialog.querySelector(".scent-family").textContent = familyNames[scent.family];
  dialog.querySelector(".scent-mood").textContent = scent.mood;
  dialog.querySelector(".scent-description").textContent = scent.description;
  setOptional(".scent-format", [scent.size, scent.notes].filter(Boolean).join(" · "));
  setOptional(".scent-price", scent.price);

  const canBuy = Boolean(scent.price && scent.checkoutUrl?.startsWith("https://"));
  const action = dialog.querySelector(".scent-action");
  action.href = canBuy ? scent.checkoutUrl : messageUrl;
  action.textContent = canBuy ? "Continue to checkout" : "Ask on Instagram";
  setOptional(".checkout-note", canBuy ? "You’ll continue to our checkout provider." : "Message us for pricing, availability, and ordering.");
  dialog.showModal();
  dialog.scrollTop = 0;
}

dialog.querySelector(".close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => {
  if (event.target === dialog) dialog.close();
});
