-- Puzzlies — initial schema.
--
-- Guiding rule: anything a player could profit from is written by the database,
-- never by the browser. Points, unlocks and orders have no client-facing write
-- policy at all; they change only through the SECURITY DEFINER functions at the
-- bottom of this file, which run with `auth.uid()` as the acting user.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- catalogue

create table public.categories (
  id          text primary key,
  title_uk    text not null,
  title_en    text not null,
  blurb_uk    text not null default '',
  blurb_en    text not null default '',
  icon        text not null default '🧩',
  accent      text not null default 'mint',
  sort_order  int  not null default 0
);

create table public.puzzles (
  id          text primary key,
  category_id text not null references public.categories (id) on delete cascade,
  title_uk    text not null,
  title_en    text not null,
  image       text not null,
  width       int  not null default 1200,
  height      int  not null default 900,
  access      text not null check (access in ('free', 'points', 'paid')),
  points_cost int,
  price_cents int,
  -- Where the picture came from and what we are allowed to do with it.
  -- Stock-photo licences generally do not cover selling the image itself.
  license     text not null default 'demo',
  sort_order  int  not null default 0,
  is_active   boolean not null default true,

  constraint points_cost_for_points_access
    check ((access = 'points') = (points_cost is not null)),
  constraint price_for_paid_access
    check ((access = 'paid') = (price_cents is not null))
);

create index puzzles_category_idx on public.puzzles (category_id, sort_order);

-- ------------------------------------------------------------------ players

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  points_balance int not null default 0 check (points_balance >= 0),
  created_at    timestamptz not null default now()
);

create table public.point_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  delta      int  not null,
  reason     text not null check (reason in ('welcome', 'complete', 'replay', 'unlock', 'refund')),
  puzzle_id  text references public.puzzles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index point_transactions_user_idx on public.point_transactions (user_id, created_at desc);

create table public.user_unlocks (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  puzzle_id  text not null references public.puzzles (id) on delete cascade,
  method     text not null check (method in ('points', 'purchase')),
  created_at timestamptz not null default now(),
  primary key (user_id, puzzle_id)
);

create table public.puzzle_progress (
  user_id         uuid not null references public.profiles (id) on delete cascade,
  puzzle_id       text not null references public.puzzles (id) on delete cascade,
  difficulty      text not null check (difficulty in ('easy', 'medium', 'hard', 'expert')),
  -- Serialised board so a half-finished puzzle survives a device change.
  state           jsonb,
  seconds         int not null default 0,
  best_seconds    int,
  completed_count int not null default 0,
  updated_at      timestamptz not null default now(),
  primary key (user_id, puzzle_id, difficulty)
);

create table public.orders (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  puzzle_id    text not null references public.puzzles (id) on delete restrict,
  amount_cents int  not null,
  currency     text not null default 'usd',
  provider     text not null default 'mock',
  provider_ref text unique,
  status       text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  created_at   timestamptz not null default now(),
  paid_at      timestamptz
);

create index orders_user_idx on public.orders (user_id, created_at desc);

-- ------------------------------------------------- profile on user creation

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  welcome_points constant int := 200;
begin
  insert into public.profiles (id, display_name, points_balance)
  values (new.id, new.raw_user_meta_data ->> 'name', welcome_points);

  insert into public.point_transactions (user_id, delta, reason)
  values (new.id, welcome_points, 'welcome');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------- RLS

alter table public.categories        enable row level security;
alter table public.puzzles           enable row level security;
alter table public.profiles          enable row level security;
alter table public.point_transactions enable row level security;
alter table public.user_unlocks      enable row level security;
alter table public.puzzle_progress   enable row level security;
alter table public.orders            enable row level security;

-- The catalogue is public; guests browse it without an account.
create policy "catalogue is readable by anyone"
  on public.categories for select using (true);

create policy "active puzzles are readable by anyone"
  on public.puzzles for select using (is_active);

-- Everything else: read your own rows, write nothing directly.
create policy "read own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "read own transactions"
  on public.point_transactions for select using (auth.uid() = user_id);

create policy "read own unlocks"
  on public.user_unlocks for select using (auth.uid() = user_id);

create policy "read own orders"
  on public.orders for select using (auth.uid() = user_id);

-- Board state is the one thing the browser may write: it is not worth anything
-- on its own, and the reward for finishing is calculated server side anyway.
create policy "read own progress"
  on public.puzzle_progress for select using (auth.uid() = user_id);

create policy "write own progress"
  on public.puzzle_progress for insert with check (auth.uid() = user_id);

create policy "update own progress"
  on public.puzzle_progress for update using (auth.uid() = user_id);

-- The balance must never be writable from a browser session, not even by a
-- policy mistake later on: take the privilege away at the column level.
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

-- ------------------------------------------------------- scoring functions

-- How long a board is expected to take, used to cap implausible times.
create function public.difficulty_meta(p_difficulty text)
returns table (pieces int, base_reward int, par_seconds int, min_seconds int)
language sql
immutable
as $$
  select *
  from (values
    ('easy',   12,  10,   45,   8),
    ('medium', 48,  30,  240,  40),
    ('hard',  108,  60,  700, 100),
    ('expert',300, 150, 2100, 300)
  ) as t(difficulty, pieces, base_reward, par_seconds, min_seconds)
  where t.difficulty = p_difficulty;
$$;

/**
 * Records a finished board and pays out the points for it.
 *
 * The reward is computed here, from the difficulty stored in this database —
 * the browser only reports which board it finished and how long it took, and
 * even that is clamped to a plausible minimum.
 */
create function public.complete_puzzle(
  p_puzzle_id  text,
  p_difficulty text,
  p_seconds    int
)
returns table (earned int, first_time boolean, is_best boolean, balance int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_meta    record;
  v_row     public.puzzle_progress%rowtype;
  v_seconds int;
  v_first   boolean;
  v_best    boolean;
  v_earned  int;
  v_speed   numeric;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_meta from public.difficulty_meta(p_difficulty);
  if v_meta is null then
    raise exception 'unknown difficulty %', p_difficulty using errcode = '22023';
  end if;

  if not exists (select 1 from public.puzzles where id = p_puzzle_id and is_active) then
    raise exception 'unknown puzzle %', p_puzzle_id using errcode = '22023';
  end if;

  -- A board cannot be finished faster than a human can physically drag the
  -- pieces; anything below that is treated as the minimum.
  v_seconds := greatest(coalesce(p_seconds, 0), v_meta.min_seconds);

  select * into v_row
  from public.puzzle_progress
  where user_id = v_user and puzzle_id = p_puzzle_id and difficulty = p_difficulty
  for update;

  v_first := v_row.best_seconds is null;
  v_best  := v_first or v_seconds < v_row.best_seconds;

  if v_first then
    v_speed  := greatest(0, least(1, 1 - v_seconds::numeric / v_meta.par_seconds));
    v_earned := v_meta.base_reward + round(v_meta.base_reward * 0.5 * v_speed);
  else
    v_earned := greatest(1, round(v_meta.base_reward * 0.2));
  end if;

  insert into public.puzzle_progress as pp
    (user_id, puzzle_id, difficulty, state, seconds, best_seconds, completed_count, updated_at)
  values
    (v_user, p_puzzle_id, p_difficulty, null, v_seconds, v_seconds, 1, now())
  on conflict (user_id, puzzle_id, difficulty) do update
    set state           = null,
        seconds         = excluded.seconds,
        best_seconds    = least(coalesce(pp.best_seconds, excluded.seconds), excluded.seconds),
        completed_count = pp.completed_count + 1,
        updated_at      = now();

  insert into public.point_transactions (user_id, delta, reason, puzzle_id)
  values (v_user, v_earned, case when v_first then 'complete' else 'replay' end, p_puzzle_id);

  update public.profiles
    set points_balance = points_balance + v_earned
    where id = v_user
    returning points_balance into balance;

  earned     := v_earned;
  first_time := v_first;
  is_best    := v_best;
  return next;
end;
$$;

/** Spends points to unlock a picture. Paid-only pictures are never unlockable. */
create function public.unlock_with_points(p_puzzle_id text)
returns table (ok boolean, reason text, balance int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_puzzle  public.puzzles%rowtype;
  v_balance int;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_puzzle from public.puzzles where id = p_puzzle_id and is_active;
  if not found then
    ok := false; reason := 'unknown-puzzle'; balance := null; return next; return;
  end if;

  if v_puzzle.access <> 'points' then
    ok := false; reason := 'not-unlockable'; balance := null; return next; return;
  end if;

  if exists (select 1 from public.user_unlocks where user_id = v_user and puzzle_id = p_puzzle_id) then
    ok := false; reason := 'already'; balance := null; return next; return;
  end if;

  -- Locking the profile row keeps two parallel unlocks from spending the same
  -- points twice.
  select points_balance into v_balance from public.profiles where id = v_user for update;

  if v_balance < v_puzzle.points_cost then
    ok := false; reason := 'not-enough'; balance := v_balance; return next; return;
  end if;

  insert into public.user_unlocks (user_id, puzzle_id, method)
  values (v_user, p_puzzle_id, 'points');

  insert into public.point_transactions (user_id, delta, reason, puzzle_id)
  values (v_user, -v_puzzle.points_cost, 'unlock', p_puzzle_id);

  update public.profiles
    set points_balance = points_balance - v_puzzle.points_cost
    where id = v_user
    returning points_balance into v_balance;

  ok := true; reason := null; balance := v_balance;
  return next;
end;
$$;

revoke all on function public.complete_puzzle(text, text, int) from public;
revoke all on function public.unlock_with_points(text) from public;
grant execute on function public.complete_puzzle(text, text, int) to authenticated;
grant execute on function public.unlock_with_points(text) to authenticated;
