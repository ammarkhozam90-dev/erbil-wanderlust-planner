-- =====================================================================
-- ErbilGo — Paid Sponsorship system (phase 1)
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- Prices are PLACEHOLDERS: edit them later from /admin/sponsorship → Pricing.
-- =====================================================================

-- Erbil "today" (UTC+3). Everything date-based uses this.
create or replace function public.erbil_today()
returns date language sql stable as
$$ select (now() at time zone 'Asia/Baghdad')::date $$;

-- ---------- Tables ----------
create table if not exists public.sponsorship_settings (
  id int primary key default 1 check (id = 1),
  payment_instructions text not null default '',
  updated_at timestamptz not null default now()
);
insert into public.sponsorship_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.sponsorship_pricing (
  placement_key text primary key,            -- 'home' or 'cat:<slug from lib/categories.ts>'
  label text not null,
  price_usd numeric(10,2) not null default 0,   -- per day
  price_iqd numeric(12,0) not null default 0,   -- per day
  max_slots int not null default 3,             -- max sponsors per day on this placement
  enabled boolean not null default true,
  sort_order int not null default 0
);

create table if not exists public.sponsorship_offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  code text,                                  -- null = automatic offer
  min_days int not null default 1,
  discount_percent int not null default 0 check (discount_percent between 0 and 100),
  bonus_days int not null default 0 check (bonus_days >= 0),
  starts_on date,
  ends_on date,
  max_uses int,
  used_count int not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists sponsorship_offers_code_uidx
  on public.sponsorship_offers (upper(code)) where code is not null;

create table if not exists public.sponsorship_campaigns (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  owner_id uuid not null,
  placements text[] not null,
  start_date date not null,
  days int not null check (days between 1 and 90),
  bonus_days int not null default 0,
  end_date date not null,
  currency text not null check (currency in ('USD','IQD')),
  base_amount numeric(14,2) not null,
  discount_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null,
  offer_id uuid references public.sponsorship_offers(id) on delete set null,
  offer_title text,
  status text not null default 'pending' check (status in ('pending','active','rejected','cancelled')),
  payment_method text,
  payment_reference text,
  paid_at timestamptz,
  confirmed_by uuid,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sponsorship_campaigns_status_dates_idx on public.sponsorship_campaigns (status, start_date, end_date);
create index if not exists sponsorship_campaigns_placements_idx on public.sponsorship_campaigns using gin (placements);
create index if not exists sponsorship_campaigns_merchant_idx on public.sponsorship_campaigns (merchant_id);

-- ---------- RLS ----------
alter table public.sponsorship_settings  enable row level security;
alter table public.sponsorship_pricing   enable row level security;
alter table public.sponsorship_offers    enable row level security;
alter table public.sponsorship_campaigns enable row level security;

drop policy if exists "sponsorship settings read"  on public.sponsorship_settings;
drop policy if exists "sponsorship settings admin" on public.sponsorship_settings;
create policy "sponsorship settings read"  on public.sponsorship_settings for select using (auth.uid() is not null);
create policy "sponsorship settings admin" on public.sponsorship_settings for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "sponsorship pricing read"  on public.sponsorship_pricing;
drop policy if exists "sponsorship pricing admin" on public.sponsorship_pricing;
create policy "sponsorship pricing read"  on public.sponsorship_pricing for select
  using (enabled or public.has_role(auth.uid(), 'admin'));
create policy "sponsorship pricing admin" on public.sponsorship_pricing for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "sponsorship offers admin" on public.sponsorship_offers;
create policy "sponsorship offers admin" on public.sponsorship_offers for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "sponsorship campaigns owner read" on public.sponsorship_campaigns;
drop policy if exists "sponsorship campaigns admin"      on public.sponsorship_campaigns;
create policy "sponsorship campaigns owner read" on public.sponsorship_campaigns for select
  using (owner_id = auth.uid());
create policy "sponsorship campaigns admin" on public.sponsorship_campaigns for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
-- NOTE: owners have NO insert/update policy on campaigns. They can only go through the RPCs below.

-- ---------- Seed placements (placeholder prices) ----------
insert into public.sponsorship_pricing (placement_key, label, price_usd, price_iqd, max_slots, sort_order) values
  ('home',            'Homepage — Featured for you', 10, 13000, 3, 0),
  ('cat:hotels',      'Hotels page',          5, 6500, 3, 1),
  ('cat:cafes',       'Cafes page',           5, 6500, 3, 2),
  ('cat:restaurants', 'Restaurants page',     5, 6500, 3, 3),
  ('cat:things-to-do','Things to Do page',    5, 6500, 3, 4),
  ('cat:landmarks',   'Landmarks page',       5, 6500, 3, 5),
  ('cat:parks',       'Parks & Nature page',  5, 6500, 3, 6),
  ('cat:nightlife',   'Nightlife page',       5, 6500, 3, 7),
  ('cat:art-culture', 'Art & Culture page',   5, 6500, 3, 8),
  ('cat:shopping',    'Shopping page',        5, 6500, 3, 9)
on conflict (placement_key) do nothing;

-- ---------- Internal: price quote (never callable from the browser) ----------
create or replace function public._sponsorship_quote(
  p_placements text[], p_start date, p_days int, p_currency text, p_code text
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_daily numeric := 0;
  v_cnt int;
  v_base numeric;
  v_offer public.sponsorship_offers;
  v_discount numeric := 0;
  v_bonus int := 0;
  v_today date := public.erbil_today();
  v_dec int;
begin
  if p_currency not in ('USD','IQD') then raise exception 'Invalid currency'; end if;
  if p_days is null or p_days < 1 or p_days > 90 then raise exception 'Days must be between 1 and 90'; end if;
  if p_start is null or p_start < v_today then raise exception 'Start date cannot be in the past'; end if;
  if p_placements is null or cardinality(p_placements) = 0 then raise exception 'Choose at least one placement'; end if;

  p_placements := (select array_agg(distinct x order by x) from unnest(p_placements) x);
  v_dec := case when p_currency = 'IQD' then 0 else 2 end;

  select count(*), coalesce(sum(case when p_currency = 'USD' then price_usd else price_iqd end), 0)
    into v_cnt, v_daily
  from public.sponsorship_pricing
  where enabled and placement_key = any(p_placements);
  if v_cnt <> cardinality(p_placements) then raise exception 'One or more placements are unavailable'; end if;

  v_base := v_daily * p_days;

  if p_code is not null and length(trim(p_code)) > 0 then
    select * into v_offer from public.sponsorship_offers o
     where upper(o.code) = upper(trim(p_code)) and o.enabled and p_days >= o.min_days
       and (o.starts_on is null or v_today >= o.starts_on)
       and (o.ends_on   is null or v_today <= o.ends_on)
       and (o.max_uses  is null or o.used_count < o.max_uses);
    if v_offer.id is null then raise exception 'Invalid or expired offer code'; end if;
  else
    select * into v_offer from public.sponsorship_offers o
     where o.code is null and o.enabled and p_days >= o.min_days
       and (o.starts_on is null or v_today >= o.starts_on)
       and (o.ends_on   is null or v_today <= o.ends_on)
       and (o.max_uses  is null or o.used_count < o.max_uses)
     order by o.discount_percent desc, o.bonus_days desc
     limit 1;
  end if;

  if v_offer.id is not null then
    v_discount := round(v_base * v_offer.discount_percent / 100.0, v_dec);
    v_bonus := v_offer.bonus_days;
  end if;

  return jsonb_build_object(
    'placements', to_jsonb(p_placements),
    'daily', v_daily, 'days', p_days, 'bonus_days', v_bonus,
    'base', round(v_base, v_dec), 'discount', v_discount, 'total', round(v_base, v_dec) - v_discount,
    'currency', p_currency,
    'offer_id', v_offer.id, 'offer_title', v_offer.title,
    'start_date', p_start, 'end_date', p_start + (p_days + v_bonus - 1)
  );
end $$;

-- ---------- Internal: capacity check ----------
create or replace function public._sponsorship_check_capacity(p_placements text[], p_start date, p_end date)
returns void
language plpgsql stable security definer set search_path = public as $$
declare k text; d date; v_max int; v_used int; i int;
begin
  foreach k in array p_placements loop
    select max_slots into v_max from public.sponsorship_pricing where placement_key = k;
    for i in 0..(p_end - p_start) loop
      d := p_start + i;
      select count(*) into v_used from public.sponsorship_campaigns c
       where c.status in ('pending','active') and k = any(c.placements)
         and d between c.start_date and c.end_date;
      if v_used >= v_max then
        raise exception 'No free sponsorship slot for "%" on %. Pick other dates or placements.', k, d;
      end if;
    end loop;
  end loop;
end $$;

-- ---------- Merchant: live quote ----------
create or replace function public.quote_sponsorship(
  p_merchant uuid, p_placements text[], p_start date, p_days int, p_currency text, p_code text default null
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_q jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if not exists (select 1 from public.merchants
                  where id = p_merchant and owner_id = auth.uid() and status = 'approved' and is_suspended = false) then
    raise exception 'You can only promote your own approved business';
  end if;
  v_q := public._sponsorship_quote(p_placements, p_start, p_days, p_currency, p_code);
  perform public._sponsorship_check_capacity(
    array(select jsonb_array_elements_text(v_q->'placements')), p_start, (v_q->>'end_date')::date);
  return v_q;
end $$;

-- ---------- Merchant: submit request (price is recomputed here, never trusted from the browser) ----------
create or replace function public.request_sponsorship(
  p_merchant uuid, p_placements text[], p_start date, p_days int, p_currency text, p_code text default null
) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare v_q jsonb; v_id uuid; v_end date; v_pl text[];
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if not exists (select 1 from public.merchants
                  where id = p_merchant and owner_id = auth.uid() and status = 'approved' and is_suspended = false) then
    raise exception 'You can only promote your own approved business';
  end if;
  if (select count(*) from public.sponsorship_campaigns where owner_id = auth.uid() and status = 'pending') >= 5 then
    raise exception 'You already have 5 pending requests. Wait for them to be reviewed or cancel some.';
  end if;

  v_q  := public._sponsorship_quote(p_placements, p_start, p_days, p_currency, p_code);
  v_pl := array(select jsonb_array_elements_text(v_q->'placements'));
  v_end := (v_q->>'end_date')::date;
  perform public._sponsorship_check_capacity(v_pl, p_start, v_end);

  insert into public.sponsorship_campaigns
    (merchant_id, owner_id, placements, start_date, days, bonus_days, end_date, currency,
     base_amount, discount_amount, total_amount, offer_id, offer_title)
  values
    (p_merchant, auth.uid(), v_pl, p_start, p_days, (v_q->>'bonus_days')::int, v_end, p_currency,
     (v_q->>'base')::numeric, (v_q->>'discount')::numeric, (v_q->>'total')::numeric,
     nullif(v_q->>'offer_id','')::uuid, v_q->>'offer_title')
  returning id into v_id;

  if v_q->>'offer_id' is not null then
    update public.sponsorship_offers set used_count = used_count + 1 where id = (v_q->>'offer_id')::uuid;
  end if;
  return v_id;
end $$;

-- ---------- Merchant: cancel own pending request ----------
create or replace function public.cancel_my_sponsorship(p_id uuid) returns void
language plpgsql volatile security definer set search_path = public as $$
declare v_offer uuid;
begin
  update public.sponsorship_campaigns set status = 'cancelled', updated_at = now()
   where id = p_id and owner_id = auth.uid() and status = 'pending'
   returning offer_id into v_offer;
  if not found then raise exception 'Only your own pending requests can be cancelled'; end if;
  if v_offer is not null then
    update public.sponsorship_offers set used_count = greatest(used_count - 1, 0) where id = v_offer;
  end if;
end $$;

-- ---------- Admin: confirm payment / reject / cancel ----------
create or replace function public.admin_review_sponsorship(
  p_id uuid, p_action text, p_method text default null, p_reference text default null, p_note text default null
) returns void
language plpgsql volatile security definer set search_path = public as $$
declare c public.sponsorship_campaigns; v_start date; v_name text;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then raise exception 'Admins only'; end if;
  select * into c from public.sponsorship_campaigns where id = p_id for update;
  if c.id is null then raise exception 'Campaign not found'; end if;
  select name into v_name from public.merchants where id = c.merchant_id;

  if p_action = 'confirm' then
    if c.status <> 'pending' then raise exception 'Only pending requests can be confirmed'; end if;
    -- If confirmed after the requested start, the merchant still gets every paid day.
    v_start := greatest(c.start_date, public.erbil_today());
    update public.sponsorship_campaigns
       set status = 'active', start_date = v_start,
           end_date = v_start + (c.days + c.bonus_days - 1),
           payment_method = p_method, payment_reference = p_reference,
           paid_at = now(), confirmed_by = auth.uid(), admin_note = p_note, updated_at = now()
     where id = p_id;
    insert into public.notifications (user_id, title, message, link)
    values (c.owner_id, 'Sponsorship confirmed',
            format('Your sponsorship for "%s" is confirmed and live.', v_name), '/promote/' || c.merchant_id::text);

  elsif p_action = 'reject' then
    if c.status <> 'pending' then raise exception 'Only pending requests can be rejected'; end if;
    update public.sponsorship_campaigns set status = 'rejected', admin_note = p_note, updated_at = now() where id = p_id;
    if c.offer_id is not null then
      update public.sponsorship_offers set used_count = greatest(used_count - 1, 0) where id = c.offer_id;
    end if;
    insert into public.notifications (user_id, title, message, link)
    values (c.owner_id, 'Sponsorship request declined',
            format('Your sponsorship request for "%s" was declined.%s', v_name, coalesce(' ' || p_note, '')),
            '/promote/' || c.merchant_id::text);

  elsif p_action = 'cancel' then
    if c.status not in ('pending','active') then raise exception 'This campaign can no longer be cancelled'; end if;
    update public.sponsorship_campaigns set status = 'cancelled', admin_note = p_note, updated_at = now() where id = p_id;
    insert into public.notifications (user_id, title, message, link)
    values (c.owner_id, 'Sponsorship cancelled',
            format('Your sponsorship for "%s" was cancelled.%s', v_name, coalesce(' ' || p_note, '')),
            '/promote/' || c.merchant_id::text);
  else
    raise exception 'Unknown action';
  end if;
end $$;

-- ---------- Public: who is sponsored right now on a placement ----------
-- Date-based: the label disappears by itself the day after end_date. No cron needed.
create or replace function public.active_sponsored(p_placement text, p_limit int default 6)
returns table (merchant_id uuid, ends_on date)
language sql stable security definer set search_path = public as $$
  select c.merchant_id, max(c.end_date)
    from public.sponsorship_campaigns c
    join public.merchants m on m.id = c.merchant_id
   where c.status = 'active'
     and p_placement = any(c.placements)
     and public.erbil_today() between c.start_date and c.end_date
     and m.status = 'approved' and m.is_suspended = false
   group by c.merchant_id
   order by random()
   limit greatest(p_limit, 0)
$$;

-- ---------- Function permissions ----------
revoke execute on function public._sponsorship_quote(text[], date, int, text, text) from public, anon, authenticated;
revoke execute on function public._sponsorship_check_capacity(text[], date, date)   from public, anon, authenticated;
revoke execute on function public.quote_sponsorship(uuid, text[], date, int, text, text)   from public, anon;
revoke execute on function public.request_sponsorship(uuid, text[], date, int, text, text) from public, anon;
revoke execute on function public.cancel_my_sponsorship(uuid) from public, anon;
revoke execute on function public.admin_review_sponsorship(uuid, text, text, text, text) from public, anon;
grant execute on function public.quote_sponsorship(uuid, text[], date, int, text, text)   to authenticated;
grant execute on function public.request_sponsorship(uuid, text[], date, int, text, text) to authenticated;
grant execute on function public.cancel_my_sponsorship(uuid) to authenticated;
grant execute on function public.admin_review_sponsorship(uuid, text, text, text, text) to authenticated;
grant execute on function public.active_sponsored(text, int) to anon, authenticated;

-- ---------- SECURITY FIX: owners must not be able to flag themselves as sponsored ----------
-- The existing "owners manage own merchants" policy lets an owner update ANY column of
-- their own row, including is_sponsored. This trigger silently reverts that for non-admins.
-- (Named "aa_" so it runs before your merchant_revert_to_pending trigger.)
create or replace function public.guard_merchant_sponsored()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.has_role(auth.uid(), 'admin') then
    if tg_op = 'INSERT' then
      new.is_sponsored := false;
    elsif new.is_sponsored is distinct from old.is_sponsored then
      new.is_sponsored := old.is_sponsored;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists aa_guard_merchant_sponsored on public.merchants;
create trigger aa_guard_merchant_sponsored
  before insert or update on public.merchants
  for each row execute function public.guard_merchant_sponsored();
