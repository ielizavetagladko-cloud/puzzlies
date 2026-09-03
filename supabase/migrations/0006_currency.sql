-- Prices get a currency.
--
-- Safe to run more than once.
--
-- WayForPay is a Ukrainian acquirer and settles in hryvnia, so that is what the
-- packs are priced in. A card issued anywhere can pay a hryvnia price — the
-- buyer's own bank converts it — but the number on the button should be the
-- number that is charged, so the site now shows it in the currency of the
-- charge instead of quietly displaying dollars and billing something else.
--
-- price_cents keeps its name and now means "the smallest unit of `currency`":
-- kopiyky for UAH, cents for USD. Switching back to dollars later is this
-- table, not a code change.

alter table public.point_packs
  add column if not exists currency text not null default 'UAH';

alter table public.point_packs
  drop constraint if exists point_packs_currency_check;
alter table public.point_packs
  add constraint point_packs_currency_check check (currency in ('UAH', 'USD', 'EUR'));

-- An order records what was actually charged, so a later price change cannot
-- rewrite history.
alter table public.orders
  add column if not exists currency text not null default 'UAH';

-- Hryvnia prices. The rate improves with the size of the pack, as before:
-- 5.6, then 6.8, then 7.7 points per hryvnia.
insert into public.point_packs (id, points, price_cents, currency, sort_order) values
  ('small',   500,  8900, 'UAH', 0),
  ('medium', 1500, 21900, 'UAH', 1),
  ('large',  4000, 51900, 'UAH', 2)
on conflict (id) do update
  set points = excluded.points,
      price_cents = excluded.price_cents,
      currency = excluded.currency,
      sort_order = excluded.sort_order;
