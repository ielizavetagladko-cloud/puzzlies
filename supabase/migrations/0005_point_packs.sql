-- Buying points.
--
-- Safe to run more than once.
--
-- Card fees are a percentage plus a fixed amount, and the fixed part is what
-- kills small sales: on a $1.25 picture it eats a quarter to a half. Selling
-- points in packs of a few dollars spreads that fixed fee over many pictures,
-- and reuses the unlock machinery that already exists.
--
-- Prices live here, never in the browser. A checkout reads the pack from this
-- table; what the page claims it costs is irrelevant.

create table if not exists public.point_packs (
  id          text primary key,
  points      int  not null check (points > 0),
  price_cents int  not null check (price_cents > 0),
  sort_order  int  not null default 0,
  is_active   boolean not null default true
);

-- Orders now cover point packs as well as one-off pictures, so the puzzle is
-- optional and the pack takes its place.
alter table public.orders alter column puzzle_id drop not null;
alter table public.orders add column if not exists pack_id text references public.point_packs (id);
alter table public.orders add column if not exists points_granted int;

alter table public.orders
  drop constraint if exists orders_subject_check;
alter table public.orders
  add constraint orders_subject_check
  check ((puzzle_id is not null) <> (pack_id is not null));

alter table public.point_packs enable row level security;

drop policy if exists "packs are readable by anyone" on public.point_packs;
create policy "packs are readable by anyone"
  on public.point_packs for select using (is_active);

grant select on public.point_packs to anon, authenticated;

insert into public.point_packs (id, points, price_cents, sort_order) values
  ('small',  500,  200, 0),
  ('medium', 1500, 500, 1),
  ('large',  4000, 1200, 2)
on conflict (id) do update
  set points = excluded.points,
      price_cents = excluded.price_cents,
      sort_order = excluded.sort_order;

/**
 * Credits a paid order, once.
 *
 * Called only by the payment webhook, which runs with the service key. The
 * whole point is that nothing reaches this function from a browser: a player
 * cannot claim their own payment succeeded.
 *
 * Idempotent by design — payment providers retry webhooks, and a retry must not
 * pay out twice.
 */
create or replace function public.fulfil_order(p_provider_ref text)
returns table (ok boolean, reason text, points_granted int, balance int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_pack  public.point_packs%rowtype;
begin
  select * into v_order
  from public.orders
  where provider_ref = p_provider_ref
  for update;

  if not found then
    ok := false; reason := 'unknown-order'; points_granted := 0; balance := null;
    return next; return;
  end if;

  -- A retry of an order already paid is a success, not an error: the provider
  -- is asking "did this land?", and it did.
  if v_order.status = 'paid' then
    ok := true; reason := 'already'; points_granted := coalesce(v_order.points_granted, 0);
    select points_balance into balance from public.profiles where id = v_order.user_id;
    return next; return;
  end if;

  if v_order.pack_id is null then
    ok := false; reason := 'not-a-pack'; points_granted := 0; balance := null;
    return next; return;
  end if;

  select * into v_pack from public.point_packs where id = v_order.pack_id;
  if not found then
    ok := false; reason := 'unknown-pack'; points_granted := 0; balance := null;
    return next; return;
  end if;

  update public.orders
    set status = 'paid',
        paid_at = now(),
        points_granted = v_pack.points
    where id = v_order.id;

  insert into public.point_transactions (user_id, delta, reason)
  values (v_order.user_id, v_pack.points, 'purchase');

  update public.profiles
    set points_balance = points_balance + v_pack.points
    where id = v_order.user_id
    returning points_balance into balance;

  ok := true; reason := null; points_granted := v_pack.points;
  return next;
end;
$$;

-- 'purchase' joins the reasons a balance can move.
alter table public.point_transactions
  drop constraint if exists point_transactions_reason_check;
alter table public.point_transactions
  add constraint point_transactions_reason_check
  check (reason in ('welcome', 'complete', 'replay', 'unlock', 'refund', 'guest', 'purchase'));

-- Nobody but the server key may run this.
revoke all on function public.fulfil_order(text) from public;
revoke all on function public.fulfil_order(text) from anon, authenticated;
