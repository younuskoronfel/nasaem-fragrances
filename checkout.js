const checkoutButton = cart.querySelector(".cart-checkout");
const checkoutHint = cart.querySelector(".cart-prices-hint");
const checkoutSubtotal = cart.querySelector(".cart-subtotal");
const checkoutEnabled = accountConfigured && nasaemAccountConfig.stripeCheckout === true;
const checkoutStorageKey = "nasaem-checkout-attempt";
let checkoutBusy = false;
let lastAttempt;
let quoteRequest;

async function checkoutRequest(payload, signal) {
  const endpoint = new URL("/functions/v1/storefront-checkout", nasaemAccountConfig.url);
  const response = await fetch(endpoint, {
    method: "POST", signal: signal ?? AbortSignal.timeout(18000),
    headers: { apikey: nasaemAccountConfig.publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "provider");
  return data;
}

function currentCheckoutLines() {
  return [...cartLines].map(([id, quantity]) => ({ id, quantity }));
}

async function refreshCheckoutQuote() {
  quoteRequest?.abort();
  checkoutSubtotal.hidden = true;
  if (!cartLines.size) return;
  const lines = currentCheckoutLines();
  const request = new AbortController();
  quoteRequest = request;
  checkoutHint.textContent = t("Checking prices…");
  try {
    const quote = await checkoutRequest({ action: "quote", lines },
      AbortSignal.any([request.signal, AbortSignal.timeout(18000)]));
    if (request.signal.aborted) return;
    const money = new Intl.NumberFormat(siteLanguage, { style: "currency", currency: quote.currency.toUpperCase() });
    const amounts = new Map(quote.lines.map(line => [line.id, line.quantity * line.unit / quote.divisor]));
    for (const row of cartItems.children) {
      const price = row.querySelector(".cart-line-price");
      price.textContent = money.format(amounts.get(row.dataset.scentId));
      price.hidden = false;
    }
    const subtotal = [...amounts.values()].reduce((total, value) => total + value, 0);
    checkoutSubtotal.textContent = t("Subtotal: {amount}", { amount: money.format(subtotal) });
    checkoutSubtotal.hidden = false;
    checkoutHint.textContent = t("Shipping and taxes are shown at checkout.");
  } catch (error) {
    if (!request.signal.aborted) checkoutHint.textContent = t(error.message === "unavailable"
      ? "Some fragrances in your cart are unavailable." : "We couldn’t load checkout. Please try again.");
  }
}

async function startCheckout() {
  if (!checkoutEnabled) return showCheckoutNotice();
  if (checkoutBusy || !cartLines.size) return;
  checkoutBusy = true;
  checkoutButton.disabled = true;
  cartNotice.replaceChildren();
  try {
    const lines = currentCheckoutLines();
    const key = JSON.stringify(lines);
    if (lastAttempt?.key !== key) lastAttempt = { key, attempt: crypto.randomUUID() };
    const { attempt } = lastAttempt;
    const session = await checkoutRequest({ action: "checkout", lines, attempt });
    if (key !== JSON.stringify(currentCheckoutLines())) {
      cartNotice.textContent = t("Your cart changed. Review it and try again.");
      return;
    }
    const destination = new URL(session.url);
    if (destination.origin !== "https://checkout.stripe.com") throw new Error("provider");
    try { sessionStorage.setItem(checkoutStorageKey, JSON.stringify({ attempt, lines, id: session.id })); } catch {}
    location.assign(destination.href);
  } catch (error) {
    cartNotice.textContent = t(error.message === "unavailable"
      ? "Some fragrances in your cart are unavailable." : "We couldn’t load checkout. Please try again.");
  } finally {
    checkoutBusy = false;
    checkoutButton.disabled = false;
  }
}

async function verifyCheckoutReturn() {
  const returnUrl = new URL(location.href);
  if (!checkoutEnabled || returnUrl.searchParams.get("checkout") !== "success") return;
  if (!cart.open) openCart();
  try {
    const pending = JSON.parse(sessionStorage.getItem(checkoutStorageKey));
    if (!pending) throw new Error("missing attempt");
    const { paid } = await checkoutRequest({ action: "status", session: pending.id, attempt: pending.attempt });
    if (!paid) throw new Error("unpaid");
    sessionStorage.removeItem(checkoutStorageKey);
    for (const { id, quantity } of pending.lines) {
      setCartQuantity(id, Math.max(0, cartQuantity(id) - quantity));
    }
    returnUrl.searchParams.delete("checkout");
    history.replaceState(history.state, "", returnUrl);
    cartNotice.textContent = t("Payment confirmed. Thank you for your order.");
  } catch {
    cartNotice.textContent = t("Payment couldn’t be confirmed yet. Check your email for your receipt.");
  }
}

checkoutButton.addEventListener("click", startCheckout);
if (checkoutEnabled) {
  cart.addEventListener("nasaem:cart-rendered", refreshCheckoutQuote);
  document.addEventListener("DOMContentLoaded", verifyCheckoutReturn, { once: true });
}
