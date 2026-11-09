import { createClient } from "npm:@supabase/supabase-js@2.102.0";
import { timingSafeEqual } from "node:crypto";

const projectURL = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(projectURL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false }
});

function authorised(request: Request) {
  const secret = Deno.env.get("NASAEM_JOBS_KEY");
  if (!secret) return false;
  const encode = new TextEncoder();
  const supplied = encode.encode(request.headers.get("x-nasaem-jobs-key") ?? "");
  const expected = encode.encode(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

async function unsubscribe(request: Request, token: string) {
  if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(token)) return new Response(null, { status: 400 });
  const storefront = Deno.env.get("NASAEM_STOREFRONT_URL");
  const page = storefront ? new URL("unsubscribe.html", storefront) : undefined;
  if (request.method === "GET") {
    if (!page) return new Response(null, { status: 503 });
    page.hash = token;
    return Response.redirect(page, 302);
  }
  if (request.method !== "POST") return new Response(null, { status: 405 });
  const { error } = await admin.from("email_preferences").update({ news: false }).eq("unsubscribe_token", token);
  if (error) return new Response("Please try again.", { status: 503 });
  if (page && new URL(request.url).searchParams.get("manual") === "1") {
    page.searchParams.set("done", "1");
    return Response.redirect(page, 303);
  }
  return new Response("Unsubscribed.", { headers: { "Cache-Control": "no-store" } });
}

Deno.serve(async request => {
  const token = new URL(request.url).searchParams.get("unsubscribe");
  if (token !== null) return unsubscribe(request, token);
  if (request.method !== "POST" || !authorised(request)) return new Response(null, { status: 403 });

  const apiKey = Deno.env.get("RESEND_API_KEY");
  const sender = Deno.env.get("NASAEM_FROM_EMAIL");
  const owner = Deno.env.get("NASAEM_OWNER_EMAIL");
  const storefront = Deno.env.get("NASAEM_STOREFRONT_URL");
  if (!apiKey || !sender || !owner || !storefront) return new Response("Email delivery needs configuration.", { status: 503 });

  const expires = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
  const expired = await admin.from("fragrance_mail").update({ failure: "Expired after delivery retries" })
    .is("sent_at", null).is("failure", null).lte("created_at", expires);
  if (expired.error) return new Response("Could not reconcile email queue.", { status: 503 });
  const { data: jobs, error } = await admin.rpc("claim_fragrance_mail");
  if (error) return new Response("Could not read email queue.", { status: 503 });

  // Keep each request below the provider’s rate limit and retry with the same message ID.
  for (const job of jobs) {
    const to = job.kind === "sold_out" ? owner : job.recipient;
    if (!to) {
      await admin.from("fragrance_mail").update({ failure: "No longer eligible" }).eq("id", job.id);
      continue;
    }
    const unsubscribeURL = job.unsubscribe_token
      ? `${projectURL}/functions/v1/fragrance-email?unsubscribe=${job.unsubscribe_token}`
      : undefined;
    const footer = unsubscribeURL ? `\n\nUnsubscribe from Nasaem news: ${unsubscribeURL}` : "";
    try {
      const sent = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(8000),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `nasaem/${job.id}`
        },
        body: JSON.stringify({
          from: sender, to: [to], subject: job.subject,
          text: `${job.message}\n\n${storefront}${footer}`,
          headers: unsubscribeURL ? {
            "List-Unsubscribe": `<${unsubscribeURL}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
          } : undefined
        })
      });
      if (sent.ok) await admin.from("fragrance_mail").update({ sent_at: new Date().toISOString() }).eq("id", job.id);
      await new Promise(resolve => setTimeout(resolve, 550));
    } catch {
      // The lease makes this message eligible again with the same idempotency key.
    }
  }
  return Response.json({ claimed: jobs.length });
});
