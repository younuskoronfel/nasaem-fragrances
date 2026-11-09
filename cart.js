const cart = document.querySelector("#cart");
const cartCardPreview = document.querySelector(".cart-card-preview");
const cartToggle = document.querySelector(".cart-toggle");
const cartItems = cart.querySelector(".cart-items");
const cartSummary = cart.querySelector(".cart-summary");
const cartNotice = cart.querySelector(".cart-notice");
const cartPhotos = cart.querySelector(".cart-photos");
const cartPreviewPicker = cart.querySelector(".cart-preview-picker");
const cartStorageKey = "nasaem-cart";
const cartCatalog = new Map(scents.map(scent => [scent.id, scent]));
const maxCartQuantity = 99;

function readCart(value) {
  try {
    const stored = JSON.parse(value);
    return new Map(scents.flatMap(({ id }) => {
      const quantity = stored?.[id];
      return Number.isSafeInteger(quantity) && quantity > 0 && quantity <= maxCartQuantity ? [[id, quantity]] : [];
    }));
  } catch {
    return new Map();
  }
}

let cartLines = new Map();
let cartOpener;
try { cartLines = readCart(localStorage.getItem(cartStorageKey)); } catch {}

function cartQuantity(id) {
  return cartLines.get(id) ?? 0;
}

function setCartQuantity(id, quantity) {
  if (quantity > 0) cartLines.set(id, Math.min(quantity, maxCartQuantity));
  else cartLines.delete(id);
  try { localStorage.setItem(cartStorageKey, JSON.stringify(Object.fromEntries(cartLines))); } catch {}
  cartNotice.replaceChildren();
  renderCart();
}

function addToCart(id) {
  const quantity = cartQuantity(id);
  if (quantity >= maxCartQuantity) return false;
  setCartQuantity(id, quantity + 1);
  return true;
}

const scentPrintOrder = ["static", "velvet-rose", "worn-leather", "sunlit-skin", "anchor", "golden-hour-bloom", "midnight-spice", "sugarplum", "momentum", "iris-noir", "wildfire", "tropic-musk", "untamed", "soft-pulse", "after-hours", "self-made"];
let packagingSelection;

function renderPackaging(photos, scent) {
  if (!scent) {
    photos.replaceChildren();
    return;
  }
  const masculine = scent.collection === "Masculine";
  const captions = ["Nasaem bag", masculine ? "Masculine box" : "Feminine box", "Box interior"];
  if (photos.dataset.scent !== scent.id || !photos.childElementCount) {
    photos.dataset.scent = scent.id;
    const tile = scentPrintOrder.indexOf(scent.id);
    const interior = document.createElement("span");
    interior.className = "packaging-interior";
    interior.setAttribute("aria-hidden", "true");
    interior.style.backgroundPosition = `${tile % 4 * 100 / 3}% ${Math.floor(tile / 4) * 100 / 3}%`;
    const stills = ["bag", masculine ? "black-box" : "brown-box"].map(file => {
      const image = new Image(480, 480);
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      image.src = `assets/packaging/${file}.jpg?v=studio-1`;
      return image;
    });
    photos.replaceChildren(...[...stills, interior].map(still => {
      const figure = document.createElement("figure");
      figure.append(still, document.createElement("figcaption"));
      return figure;
    }));
  }
  captions.forEach((caption, index) => {
    photos.children[index].querySelector("figcaption").textContent = index === 2
      ? t("{name} box interior", { name: scent.name }) : t(caption);
  });
}

function showCartPackaging() {
  const items = [...cartLines.keys()];
  if (!cartLines.has(packagingSelection)) packagingSelection = items[0];
  if (cartPreviewPicker.dataset.items !== items.join()) {
    cartPreviewPicker.dataset.items = items.join();
    cartPreviewPicker.replaceChildren(...items.map(id => {
      const option = document.createElement("button");
      option.type = "button";
      option.dataset.preview = id;
      option.textContent = cartCatalog.get(id).name;
      return option;
    }));
  }
  cartPreviewPicker.hidden = items.length < 2;
  for (const option of cartPreviewPicker.children) {
    option.setAttribute("aria-pressed", String(option.dataset.preview === packagingSelection));
  }
  renderPackaging(cartPhotos, cartCatalog.get(packagingSelection));
}

cartPreviewPicker.addEventListener("click", event => {
  const option = event.target.closest("[data-preview]");
  if (!option) return;
  packagingSelection = option.dataset.preview;
  showCartPackaging();
});

function bottleStill(scent) {
  return scent.collection === "Masculine" ? "assets/packaging/onyx-bottle.webp" : "assets/packaging/amber-bottle.webp";
}

function renderCart() {
  const total = [...cartLines.values()].reduce((sum, quantity) => sum + quantity, 0);
  cartToggle.querySelector(".cart-count").textContent = new Intl.NumberFormat(siteLanguage).format(total);
  cartSummary.textContent = t(total === 1 ? "{count} bottle" : "{count} bottles", {
    count: new Intl.NumberFormat(siteLanguage).format(total)
  });
  if (!cart.open) return;
  const active = document.activeElement;
  const activeAction = active?.dataset.cartAction;
  const activeId = active?.closest("[data-scent-id]")?.dataset.scentId;
  const nextFocusId = active?.closest("[data-scent-id]")?.nextElementSibling?.dataset.scentId;
  cart.querySelector(".cart-empty").hidden = total > 0;
  cart.querySelector(".cart-footer").hidden = total === 0;
  cart.querySelector(".cart-packaging").hidden = total === 0;
  cartItems.replaceChildren(...[...cartLines].map(([id, quantity]) => {
    const scent = cartCatalog.get(id);
    const row = document.createElement("li");
    row.dataset.scentId = id;
    row.innerHTML = `
      <button class="cart-thumb" type="button" aria-haspopup="dialog">
        <img width="72" height="90" alt="">
      </button>
      <div class="cart-item-details">
        <strong dir="auto"></strong>
        <span></span>
        <div class="cart-item-controls">
          <div class="cart-stepper">
            <button type="button" data-cart-action="less"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10h10"/></svg></button>
            <bdi></bdi>
            <button type="button" data-cart-action="more"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10h10m-5-5v10"/></svg></button>
          </div>
          <button type="button" class="text-link" data-cart-action="remove"></button>
        </div>
      </div>`;
    const thumb = row.querySelector(".cart-thumb");
    thumb.setAttribute("aria-label", t("{name} campaign artwork", { name: scent.name }));
    setCardArtwork(thumb.querySelector("img"), id);
    thumb.addEventListener("click", () => {
      const art = cartCardPreview.querySelector("img");
      art.removeAttribute("src");
      art.alt = t("{name} campaign artwork", { name: scent.name });
      setCardArtwork(art, id, true);
      cartCardPreview.querySelector("h2").textContent = scent.name;
      cartCardPreview.showModal();
    });
    row.querySelector("strong").textContent = scent.name;
    const soldOut = isScentSoldOut(id);
    row.querySelector("span").textContent = soldOut ? `${t(scent.collection)} · ${t("Sold out")}` : t(scent.collection);
    row.querySelector("bdi").textContent = new Intl.NumberFormat(siteLanguage).format(quantity);
    for (const [action, label] of Object.entries({ less: "Decrease quantity of {name}", more: "Increase quantity of {name}", remove: "Remove {name}" })) {
      row.querySelector(`[data-cart-action="${action}"]`).setAttribute("aria-label", t(label, { name: scent.name }));
    }
    row.querySelector('[data-cart-action="more"]').disabled = soldOut || quantity >= maxCartQuantity;
    row.querySelector('[data-cart-action="remove"]').textContent = t("Remove");
    return row;
  }));
  showCartPackaging();
  if (activeAction) {
    const row = [...cartItems.children].find(item => item.dataset.scentId === activeId)
      ?? [...cartItems.children].find(item => item.dataset.scentId === nextFocusId)
      ?? cartItems.lastElementChild;
    const button = row?.querySelector(`[data-cart-action="${activeAction}"]:not(:disabled)`)
      ?? row?.querySelector("[data-cart-action]");
    (button ?? cart.querySelector(".cart-empty a")).focus({ preventScroll: true });
  }
}

function openCart(opener = cartToggle) {
  cartOpener = opener;
  cartNotice.replaceChildren();
  cart.showModal();
  renderCart();
  cart.querySelector(".cart-content").scrollTop = 0;
}

cartToggle.hidden = false;
cartToggle.addEventListener("click", () => openCart());
cart.querySelector(".close").addEventListener("click", () => cart.close());
cart.addEventListener("close", () => {
  const opener = cartOpener?.isConnected ? cartOpener : cartToggle;
  opener.focus({ preventScroll: true });
});
cart.querySelector(".cart-empty a").addEventListener("click", () => cart.close());
cartItems.addEventListener("click", event => {
  const action = event.target.closest("[data-cart-action]")?.dataset.cartAction;
  if (!action) return;
  const { scentId } = event.target.closest("[data-scent-id]").dataset;
  const quantity = cartQuantity(scentId);
  setCartQuantity(scentId, action === "remove" ? 0 : quantity + (action === "more" ? 1 : -1));
});

function showCheckoutNotice() {
  const heading = document.createElement("strong");
  heading.textContent = t("Checkout coming soon");
  const message = document.createElement("p");
  message.textContent = t("Your selections stay in this cart on this device.");
  cartNotice.replaceChildren(heading, message);
}

cart.querySelector(".cart-checkout").addEventListener("click", showCheckoutNotice);
document.addEventListener("nasaem:availability", renderCart);
document.addEventListener("nasaem:language", () => {
  renderCart();
  if (cartNotice.hasChildNodes()) showCheckoutNotice();
});
addEventListener("storage", event => {
  if (event.key !== cartStorageKey && event.key !== null) return;
  cartLines = readCart(event.newValue);
  if (!cartLines.size) cartNotice.replaceChildren();
  renderCart();
});
renderCart();
