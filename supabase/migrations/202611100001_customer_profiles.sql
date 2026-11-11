create table public.customer_profiles (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  slot smallint not null check (slot between 1 and 5),
  name text not null check (name = btrim(name) and char_length(name) between 1 and 32),
  primary key (user_id, slot)
);

alter table public.customer_profiles enable row level security;
revoke all on public.customer_profiles from public, anon, authenticated;
grant select (slot, name), insert (slot, name), update (name) on public.customer_profiles to authenticated;
create policy "Customers manage their own profiles" on public.customer_profiles for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
