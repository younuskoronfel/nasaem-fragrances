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
- Checkout remains a local cart preview. A future Stripe backend should update stock from confirmed inventory changes and validate items and prices server-side before creating a checkout session.
