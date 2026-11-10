# Nasaem accounts and email

GitHub Pages continues to serve the storefront. Supabase provides passwordless email accounts and storage for inventory, email consent, and restock alerts. The server sends through Resend. The storefront shows an account coming-soon message until `account-config.js` is configured.

## Connect the services

1. Create the Supabase project and verify an owned sending domain with your email provider. Configure [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) in Supabase Auth so sign-in codes can reach customers. Enable email signups and confirmation, and put `{{ .Token }}` in the confirmation and magic-link email templates in place of the sign-in link. Test that a brand-new email address and a returning account both receive a usable code.
2. Link the Supabase CLI to the project and run `supabase db push`. The migration creates all sixteen fragrances with unknown stock status. Apply `supabase/tests/stock_alerts.sql` on an isolated test project to verify stock transitions and the queue lease.
3. Set the Edge Function secrets `RESEND_API_KEY`, `NASAEM_FROM_EMAIL`, `NASAEM_OWNER_EMAIL`, `NASAEM_STOREFRONT_URL` (include the trailing slash), and `NASAEM_JOBS_KEY` (a separate randomly generated secret). Deploy `supabase functions deploy fragrance-email`. The sender must be on your verified domain. Keep these values in the provider dashboards or your secret store.
4. Enable `pg_net` and `pg_cron`. In Supabase Vault, create `nasaem_jobs_key` with the same value as the worker's `NASAEM_JOBS_KEY`, and `nasaem_project_url` with the project URL without a trailing slash. Register this cron job in the SQL editor.

```sql
select cron.schedule(
  'nasaem-fragrance-email',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'nasaem_project_url')
           || '/functions/v1/fragrance-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-nasaem-jobs-key', (select decrypted_secret from vault.decrypted_secrets where name = 'nasaem_jobs_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 100000
  );
  $$
);
```

5. Set only the project URL and browser-safe publishable key in `account-config.js`. Before enabling customer traffic, verify sign-in, a test sold-out email, restock consent and delivery, and newsletter unsubscribe. Confirm sender authentication and add a link to your published privacy information in the account panel.

## Stock and email

- Change a fragrance's `inventory.status` in Supabase to `in_stock` or `sold_out`. Each transition into sold out queues an owner email. Moving from sold out to in stock emails customers who explicitly asked to watch that fragrance.
- Customers can manage their restock alerts and opt in or out of launch and news emails from their account. A newsletter email includes an unsubscribe link and one-click unsubscribe headers. To queue a campaign, run `select public.queue_fragrance_news('unique-campaign-id', 'Subject', 'Plain-text message');` from the SQL editor. Use a new campaign ID for a new message.
- `fragrance_mail` tracks queued, sent, expired and skipped messages. The worker retries transient failures for up to 20 hours. Check failed jobs before creating a replacement campaign.


## Google sign-in

1. Open [Supabase New Project](https://database.new/) and create a project named `nasaem-fragrances`. Choose a region near your customers and store its database password in a password manager. Copy the project URL and publishable key from the project's **Connect** dialog.
2. Link the project with `supabase link --project-ref YOUR_PROJECT_REF` and apply the inventory migration with `supabase db push`.
3. Follow the [Supabase Google provider instructions](https://supabase.com/docs/guides/auth/social-sign-in/auth-google). Register the callback URL shown by Supabase in Google Cloud and set the Google client ID and secret in Supabase Auth. Add `https://younuskoronfel.github.io/nasaem-fragrances/?auth=google` to the Supabase redirect allow list. Use Google test users until the OAuth app is ready for customers.
4. Set the public project URL and publishable key in `account-config.js`. Turn on `googleSignIn` once the provider is enabled, then verify a new account, a returning account, and sign-out. Configure SMTP and the email code templates before making email sign-in available to customers.

## Stripe checkout

1. In [Stripe](https://dashboard.stripe.com/), use test mode first. Create one product and one active, one-time Price per fragrance with the approved names, amounts, and currency. The inventory table already contains the sixteen matching scent IDs. Mark each sellable fragrance `in_stock`; unknown and sold-out stock cannot be checked out.
2. In Supabase's Edge Function secrets, set `STRIPE_SECRET_KEY`, `NASAEM_STOREFRONT_URL`, `NASAEM_STRIPE_PRICES` (a JSON object mapping scent IDs to Stripe Price IDs), `NASAEM_SHIPPING_COUNTRIES` (comma-separated two-letter country codes), and `NASAEM_STRIPE_SHIPPING_RATE` (a Stripe shipping-rate ID, including a zero-cost rate if shipping is free). Enable `NASAEM_STRIPE_AUTOMATIC_TAX=true` only if Stripe Tax is configured. Use matching test or live IDs throughout. Keep secret keys out of GitHub and chat.
3. Deploy `supabase functions deploy storefront-checkout`. The function supports guest carts, reads the catalog and stock on the server, calculates the subtotal from Stripe Prices, and creates a hosted payment page for the selected quantities. The public storefront keeps the payment controls in preview mode until `stripeCheckout` is enabled.
4. Test a multi-scent order, declined payment, cancellation, and a sold-out item with Stripe test cards. On a confirmed return, the browser removes the purchased quantities. Enable Stripe receipts and use the Stripe Dashboard to verify paid orders and fulfill them, even when a customer closes the payment page before returning. Update stock as orders are fulfilled. This inventory table tracks stock status and does not reserve quantities.
