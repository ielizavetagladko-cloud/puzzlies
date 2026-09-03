-- New accounts stop arriving with a name already public.
--
-- Safe to run more than once.
--
-- handle_new_user() has copied Google's "name" claim into display_name since
-- before display_name meant anything — it was a private, unused column back
-- then. It is the leaderboard's public nickname now, and every other part of
-- that design goes out of its way to keep a player anonymous until they
-- choose otherwise: a scrap of hash instead of an email, a name field that
-- starts empty, a hint explaining exactly what strangers see. This one
-- leftover quietly defeated all of it for anyone who signs in with Google —
-- their real name went straight onto a board other players can see, without
-- them ever being asked.
--
-- New sign-ins get a blank display_name like everyone else now. Existing
-- accounts are untouched: nothing here can tell an auto-filled name apart from
-- one a player typed on purpose and would be upset to lose.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  welcome_points constant int := 200;
begin
  insert into public.profiles (id, points_balance)
  values (new.id, welcome_points);

  insert into public.point_transactions (user_id, delta, reason)
  values (new.id, welcome_points, 'welcome');

  return new;
end;
$$;
