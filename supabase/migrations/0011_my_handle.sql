-- A player's own anonymous handle, available before they have solved anything.
--
-- Safe to run more than once.
--
-- leaderboard() computes the same scrap of hash for every ranked player, but
-- ranking requires solved boards — a brand new account has none, so nothing
-- could show them what their own "Player ####" would look like. The formula is
-- copied exactly (substr(md5(id::text), 1, 4)) so the two never disagree.
create or replace function public.my_handle()
returns text
language sql
stable
as $$
  select substr(md5(auth.uid()::text), 1, 4);
$$;

grant execute on function public.my_handle() to authenticated;
