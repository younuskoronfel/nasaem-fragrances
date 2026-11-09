begin;
insert into public.inventory (scent_id, name, status) values ('test-fragrance', 'Test Fragrance', 'in_stock');
update public.inventory set status = 'sold_out' where scent_id = 'test-fragrance';
update public.inventory set status = 'sold_out' where scent_id = 'test-fragrance';

do $$
begin
  if (select count(*) from public.fragrance_mail where scent_id = 'test-fragrance' and kind = 'sold_out') <> 1 then
    raise exception 'A stock transition must produce exactly one owner alert';
  end if;
  if (select count(*) from public.claim_fragrance_mail() where subject = 'Test Fragrance is sold out') <> 1 then
    raise exception 'The owner alert should be claimable';
  end if;
  if exists (select from public.claim_fragrance_mail() where subject = 'Test Fragrance is sold out') then
    raise exception 'A claimed message must remain leased';
  end if;
end;
$$;
rollback;
