const cardId = new URLSearchParams(location.search).get("scent");
const cardScent = scents.find(({ id }) => id === cardId);
if (cardScent) {
  document.title = `${cardScent.name} — Nasaem Fragrances`;
  document.querySelector("h1").textContent = cardScent.name;
  const image = document.querySelector(".card-page img");
  image.alt = t("{name} campaign artwork", { name: cardScent.name });
  image.addEventListener("load", () => { image.hidden = false; }, { once: true });
  setCardArtwork(image, cardId, true);
  const description = document.querySelector(".card-page p");
  description.textContent = scentText(cardScent, "description");
  description.hidden = !description.textContent;
  const product = document.querySelector(".card-page .button");
  product.href = `./?scent=${encodeURIComponent(cardId)}#collection`;
  product.hidden = false;
}
