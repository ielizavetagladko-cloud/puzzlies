-- The missing half of "owners may edit their own name and avatar".
--
-- Safe to run more than once.
--
-- 0001_init.sql granted UPDATE on profiles(display_name) and 0009_avatars.sql
-- widened that to (display_name, avatar), but a column grant only says which
-- columns a statement may touch — row level security still decides whether the
-- row may be touched at all, and profiles had no UPDATE policy. RLS defaults
-- to deny, so every save silently affected zero rows: no error, no write, and
-- the player never learned why the name they typed never stuck.
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
