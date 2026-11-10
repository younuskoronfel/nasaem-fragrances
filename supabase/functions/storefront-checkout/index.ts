const settings = {
  storefront: Deno.env.get("NASAEM_STOREFRONT_URL"),
  stripeKey: Deno.env.get("STRIPE_SECRET_KEY"),
  prices: Deno.env.get("NASAEM_STRIPE_PRICES"),
  countries: Deno.env.get("NASAEM_SHIPPING_COUNTRIES"),
  shippingRate: Deno.env.get("NASAEM_STRIPE_SHIPPING_RATE"),
  automaticTax: Deno.env.get("NASAEM_STRIPE_AUTOMATIC_TAX") === "true",
  project: Deno.env.get("SUPABASE_URL"),
  serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
};

class CheckoutError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

type CartLine = { id: string; quantity: number };
type Price = { id: string; active: boolean; type: string; currency: string; unit_amount: number | null };
type Session = {
  id: string; url: string | null; mode: string; status: string; payment_status: string;
  metadata: Record<string, string> | null;
};

function validateLines(input: unknown): CartLine[] {
  if (!Array.isArray(input) || !input.length || input.length > 16) throw new CheckoutError(400, "cart");
  const ids = new Set<string>();
  for (const line of input) {
    if (!line || typeof line.id !== "string" || !/^[a-z-]{1,40}$/.test(line.id)
      || ids.has(line.id) || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99) {
      throw new CheckoutError(400, "cart");
    }
    ids.add(line.id);
  }
  return input;
}

async function stripe<T>(path: string, params?: URLSearchParams, idempotencyKey?: string): Promise<T> {
  const headers = new Headers({ Authorization: `Bearer ${settings.stripeKey}` });
  if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers, method: params ? "POST" : "GET", body: params, signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new CheckoutError(502, "provider");
  return await response.json();
}

async function catalog(lines: CartLine[], priceIds: Record<string, string>) {
  const ids = lines.map(line => line.id);
  const query = new URLSearchParams({ select: "scent_id,status", scent_id: `in.(${ids.join(",")})` });
  const response = await fetch(`${settings.project}/rest/v1/inventory?${query}`, {
    headers: { apikey: settings.serviceKey!, Authorization: `Bearer ${settings.serviceKey}` },
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new CheckoutError(502, "provider");
  const rows = await response.json() as { scent_id: string; status: string }[];
  const ready = new Set(rows.filter(row => row.status === "in_stock").map(row => row.scent_id));
  if (lines.some(line => !ready.has(line.id) || !/^price_[a-zA-Z0-9]+$/.test(priceIds[line.id] ?? ""))) {
    throw new CheckoutError(409, "unavailable");
  }

  const prices = await Promise.all(lines.map(line => stripe<Price>(`prices/${priceIds[line.id]}`)));
  const currency = prices[0].currency;
  if (prices.some(price => !price.active || price.type !== "one_time" || price.currency !== currency
    || !Number.isSafeInteger(price.unit_amount) || price.unit_amount! <= 0)) {
    throw new CheckoutError(409, "unavailable");
  }
  return {
    currency,
    divisor: /^(bif|clp|djf|gnf|jpy|kmf|krw|mga|pyg|rwf|vnd|vuv|xaf|xof|xpf)$/.test(currency) ? 1 : 100,
    lines: lines.map((line, index) => ({ ...line, price: prices[index].id, unit: prices[index].unit_amount! }))
  };
}

Deno.serve(async request => {
  const origin = request.headers.get("origin");
  const headers = new Headers({ "Cache-Control": "no-store", Vary: "Origin" });
  const json = (body: object, status = 200) => Response.json(body, { status, headers });
  try {
    const storefront = new URL(settings.storefront ?? "https://invalid.invalid/");
    if (origin !== storefront.origin) return json({ error: "origin" }, 403);
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Headers", "apikey, content-type");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return json({ error: "method" }, 405);

    const countries = settings.countries?.split(",").map(value => value.trim().toUpperCase()) ?? [];
    if (!settings.stripeKey || !settings.project || !settings.serviceKey || !settings.prices
      || !countries.length || countries.some(code => !/^[A-Z]{2}$/.test(code))
      || !/^shr_[a-zA-Z0-9]+$/.test(settings.shippingRate ?? "")) {
      throw new CheckoutError(503, "disabled");
    }

    const raw = await request.text();
    if (raw.length > 6000) throw new CheckoutError(400, "cart");
    let body;
    try { body = JSON.parse(raw); } catch { throw new CheckoutError(400, "cart"); }

    if (body?.action === "status") {
      if (typeof body.session !== "string" || !/^cs_(test|live)_[a-zA-Z0-9]{1,160}$/.test(body.session)
        || typeof body.attempt !== "string" || !/^[a-f0-9-]{36}$/.test(body.attempt)) throw new CheckoutError(400, "cart");
      const session = await stripe<Session>(`checkout/sessions/${body.session}`);
      if (session.mode !== "payment" || session.metadata?.nasaem_attempt !== body.attempt) {
        throw new CheckoutError(404, "cart");
      }
      return json({ paid: session.status === "complete" && session.payment_status === "paid" });
    }

    if (body?.action !== "quote" && body?.action !== "checkout") throw new CheckoutError(400, "cart");
    const lines = validateLines(body.lines);
    const quote = await catalog(lines, JSON.parse(settings.prices));
    if (body.action === "quote") return json(quote);
    if (typeof body.attempt !== "string" || !/^[a-f0-9-]{36}$/.test(body.attempt)) throw new CheckoutError(400, "cart");

    const success = new URL(storefront);
    success.searchParams.set("checkout", "success");
    const cancel = new URL(storefront);
    cancel.searchParams.set("cart", "open");
    const params = new URLSearchParams({
      mode: "payment", "payment_method_types[0]": "card", "metadata[nasaem_attempt]": body.attempt,
      success_url: success.href, cancel_url: cancel.href,
      "shipping_options[0][shipping_rate]": settings.shippingRate!,
      "adaptive_pricing[enabled]": "false",
      "automatic_tax[enabled]": String(settings.automaticTax)
    });
    countries.forEach((country, index) => params.set(`shipping_address_collection[allowed_countries][${index}]`, country));
    quote.lines.forEach(({ price, quantity }, index) => {
      params.set(`line_items[${index}][price]`, price);
      params.set(`line_items[${index}][quantity]`, String(quantity));
    });
    const session = await stripe<Session>("checkout/sessions", params, `nasaem-${body.attempt}`);
    if (!session.url) throw new CheckoutError(502, "provider");
    return json({ id: session.id, url: session.url });
  } catch (error) {
    if (error instanceof CheckoutError) return json({ error: error.code }, error.status);
    console.error("Checkout request failed", error instanceof Error ? error.name : "unknown");
    return json({ error: "provider" }, 502);
  }
});
