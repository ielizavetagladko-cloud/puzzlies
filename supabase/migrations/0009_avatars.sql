-- Nicknames and avatars.
--
-- Safe to run more than once.
--
-- The avatar is the name of one of a fixed set drawn in the app, not a file
-- anyone uploads. That keeps the leaderboard free of things nobody has time to
-- moderate, and costs no storage.

alter table public.profiles
  add column if not exists avatar text;

alter table public.profiles
  drop constraint if exists profiles_avatar_check;
alter table public.profiles
  add constraint profiles_avatar_check
  check (avatar is null or length(avatar) between 1 and 32);

-- A name nobody can read is not a name, and one that fills the row is not
-- either.
alter table public.profiles
  drop constraint if exists profiles_display_name_check;
alter table public.profiles
  add constraint profiles_display_name_check
  check (display_name is null or length(trim(display_name)) between 1 and 24);

-- Owners may set these two columns and nothing else — not their balance.
revoke update on public.profiles from authenticated;
grant update (display_name, avatar) on public.profiles to authenticated;

/**
 * The board again, now carrying whatever the player chose to be called and to
 * look like. Still no email, still no user id.
 */
create or replace function public.leaderboard(p_difficulty text, p_limit int default 20)
returns table (
  place        bigint,
  handle       text,
  display_name text,
  avatar       text,
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
    p.avatar,
    r.solved,
    r.avg_seconds,
    r.user_id = auth.uid()                              as is_me
  from ranked r
  join public.profiles p on p.id = r.user_id
  order by place, r.user_id
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

grant execute on function public.leaderboard(text, int) to anon, authenticated;
