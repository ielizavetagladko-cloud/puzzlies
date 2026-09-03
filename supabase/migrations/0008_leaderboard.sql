-- The leaderboard.
--
-- Safe to run more than once.
--
-- Ranked by average best time, but only ever within one difficulty. Across
-- difficulties the number means nothing: someone who only plays 12 pieces beats
-- everyone who plays 300, and not by being quicker.
--
-- Reading it needs other people's rows, which row level security rightly keeps
-- private. So it is served by functions that run above those rules and hand
-- back only what a board needs — never an email, never a user id.

create index if not exists puzzle_progress_finished_idx
  on public.puzzle_progress (difficulty, best_seconds)
  where best_seconds is not null;

/**
 * How many finished boards it takes to appear.
 *
 * One lucky run on one easy picture should not top a table; a few of them is a
 * habit rather than an accident.
 */
create or replace function public.leaderboard_minimum()
returns int language sql immutable as $$ select 3 $$;

/**
 * The table itself.
 *
 * `handle` is a stable scrap of hash, not the user id: enough to tell two
 * unnamed players apart, useless for anything else. Players who set a display
 * name are shown by it, which is the only way anyone becomes identifiable here,
 * and it is their own doing.
 */
create or replace function public.leaderboard(p_difficulty text, p_limit int default 20)
returns table (
  place        bigint,
  handle       text,
  display_name text,
  solved       bigint,
  avg_seconds  int,
  is_me        boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select
      pr.user_id,
      count(*)                          as solved,
      round(avg(pr.best_seconds))::int  as avg_seconds
    from public.puzzle_progress pr
    where pr.difficulty = p_difficulty
      and pr.best_seconds is not null
    group by pr.user_id
    having count(*) >= public.leaderboard_minimum()
  )
  select
    rank() over (order by r.avg_seconds, r.solved desc) as place,
    substr(md5(r.user_id::text), 1, 4)                  as handle,
    p.display_name,
    r.solved,
    r.avg_seconds,
    r.user_id = auth.uid()                              as is_me
  from ranked r
  join public.profiles p on p.id = r.user_id
  order by place, r.user_id
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

/**
 * Where the caller stands, even when that is far below the visible table.
 *
 * `total` is how many players are ranked at all, so "12th" can be read as
 * "12th of 40" rather than left hanging.
 */
create or replace function public.leaderboard_me(p_difficulty text)
returns table (
  place       bigint,
  solved      bigint,
  avg_seconds int,
  total       bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select
      pr.user_id,
      count(*)                          as solved,
      round(avg(pr.best_seconds))::int  as avg_seconds
    from public.puzzle_progress pr
    where pr.difficulty = p_difficulty
      and pr.best_seconds is not null
    group by pr.user_id
    having count(*) >= public.leaderboard_minimum()
  ),
  placed as (
    select r.*, rank() over (order by r.avg_seconds, r.solved desc) as place
    from ranked r
  )
  select pl.place, pl.solved, pl.avg_seconds, (select count(*) from placed)
  from placed pl
  where pl.user_id = auth.uid();
$$;

grant execute on function public.leaderboard(text, int)  to anon, authenticated;
grant execute on function public.leaderboard_me(text)    to anon, authenticated;
grant execute on function public.leaderboard_minimum()   to anon, authenticated;
