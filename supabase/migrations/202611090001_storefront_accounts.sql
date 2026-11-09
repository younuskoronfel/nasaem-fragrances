create table public.inventory (
  scent_id text primary key,
  name text not null,
  status text not null default 'unknown' check (status in ('unknown', 'in_stock', 'sold_out'))
);

insert into public.inventory (scent_id, name) values
  ('static', 'Static'), ('velvet-rose', 'Velvet Rose'), ('worn-leather', 'Worn Leather'),
  ('sunlit-skin', 'Sunlit Skin'), ('anchor', 'Anchor'), ('golden-hour-bloom', 'Golden Hour Bloom'),
  ('midnight-spice', 'Midnight Spice'), ('sugarplum', 'Sugarplum'), ('momentum', 'Momentum'),
  ('iris-noir', 'Iris Noir'), ('wildfire', 'Wildfire'), ('tropic-musk', 'Tropic Musk'),
  ('untamed', 'Untamed'), ('soft-pulse', 'Soft Pulse'), ('after-hours', 'After Hours'),
  ('self-made', 'Self-Made');

create table public.email_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  news boolean not null default false,
  unsubscribe_token uuid not null unique default gen_random_uuid()
);

create table public.restock_watches (
  user_id uuid not null references auth.users(id) on delete cascade,
  scent_id text not null references public.inventory(scent_id) on delete cascade,
  primary key (user_id, scent_id)
);

create table public.fragrance_mail (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('sold_out', 'restock', 'news')),
  user_id uuid references auth.users(id) on delete cascade,
  scent_id text references public.inventory(scent_id),
  campaign text,
  subject text not null,
  message text not null,
  created_at timestamptz not null default now(),
  retry_at timestamptz not null default now(),
  attempts integer not null default 0,
  sent_at timestamptz,
  failure text,
  unique (campaign, user_id)
);

alter table public.inventory enable row level security;
alter table public.email_preferences enable row level security;
alter table public.restock_watches enable row level security;
alter table public.fragrance_mail enable row level security;

revoke all on public.inventory, public.email_preferences, public.restock_watches, public.fragrance_mail
  from anon, authenticated;
grant select on public.inventory to anon, authenticated;
grant select (user_id, news), insert (user_id, news), update (user_id, news) on public.email_preferences to authenticated;
grant select, insert, delete on public.restock_watches to authenticated;
grant all on public.inventory, public.email_preferences, public.restock_watches, public.fragrance_mail to service_role;
create policy "Public fragrance availability" on public.inventory for select using (true);
create policy "Own email preferences" on public.email_preferences for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own restock alerts" on public.restock_watches for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create function public.queue_stock_email() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'sold_out' then
    insert into public.fragrance_mail (kind, scent_id, subject, message)
    values ('sold_out', new.scent_id, new.name || ' is sold out', new.name || ' was marked sold out in Nasaem inventory.');
  elsif old.status = 'sold_out' and new.status = 'in_stock' then
    insert into public.fragrance_mail (kind, user_id, scent_id, subject, message)
    select 'restock', user_id, new.scent_id, new.name || ' is back',
      new.name || ' is available again at Nasaem Fragrances.'
    from public.restock_watches where scent_id = new.scent_id;
  end if;
  return new;
end;
$$;
revoke execute on function public.queue_stock_email() from public;
create trigger queue_stock_email after update of status on public.inventory
  for each row when (old.status is distinct from new.status) execute function public.queue_stock_email();

create function public.queue_fragrance_news(campaign_key text, subject_line text, message_text text)
returns bigint language sql security definer set search_path = '' as $$
  with queued as (
    insert into public.fragrance_mail (kind, user_id, campaign, subject, message)
    select 'news', p.user_id, campaign_key, subject_line, message_text
    from public.email_preferences p
    join auth.users u on u.id = p.user_id and u.email_confirmed_at is not null
    where p.news and length(btrim(campaign_key)) > 0
    on conflict (campaign, user_id) do nothing
    returning id
  )
  select count(*) from queued;
$$;
revoke execute on function public.queue_fragrance_news(text, text, text) from public, anon, authenticated;
grant execute on function public.queue_fragrance_news(text, text, text) to service_role;

create function public.claim_fragrance_mail()
returns table (id uuid, kind text, subject text, message text, recipient text, unsubscribe_token uuid)
language sql security definer set search_path = '' as $$
  with due as (
    select m.id from public.fragrance_mail m
    where m.sent_at is null and m.failure is null and m.retry_at <= now()
      and m.created_at > now() - interval '20 hours'
    order by m.created_at
    limit 10 for update skip locked
  ), claimed as (
    update public.fragrance_mail m
    set retry_at = now() + interval '10 minutes', attempts = m.attempts + 1
    from due where m.id = due.id
    returning m.*
  )
  select m.id, m.kind, m.subject, m.message,
    case
      when m.kind = 'news' and p.news then u.email
      when m.kind = 'restock' and w.user_id is not null and i.status = 'in_stock' then u.email
    end,
    case when m.kind = 'news' then p.unsubscribe_token end
  from claimed m
  left join auth.users u on u.id = m.user_id and u.email_confirmed_at is not null
  left join public.email_preferences p on p.user_id = m.user_id
  left join public.restock_watches w on w.user_id = m.user_id and w.scent_id = m.scent_id
  left join public.inventory i on i.scent_id = m.scent_id;
$$;
-- Only the private worker can claim jobs or see recipients.
revoke execute on function public.claim_fragrance_mail() from public, anon, authenticated;
grant execute on function public.claim_fragrance_mail() to service_role;
