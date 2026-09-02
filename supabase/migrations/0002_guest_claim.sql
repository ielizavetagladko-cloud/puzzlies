-- Carrying guest progress into a new account.
--
-- Safe to run more than once.
--
-- The honest problem: guest progress lives in the browser, so the numbers the
-- browser reports cannot be trusted. Refusing to carry anything over would
-- punish people for signing in — exactly at the moment we ask them to. So the
-- claim is allowed, but bounded: once per account, and capped at roughly one
-- unlocked picture's worth of points. A cheater gains one picture; an honest
-- player keeps what they earned.

alter table public.profiles
  add column if not exists guest_claimed_at timestamptz;

-- 'guest' joins the list of reasons a balance can move.
alter table public.point_transactions
  drop constraint if exists point_transactions_reason_check;
alter table public.point_transactions
  add constraint point_transactions_reason_check
  check (reason in ('welcome', 'complete', 'replay', 'unlock', 'refund', 'guest'));

/** Ceiling on carried-over points. Deliberately small. */
create or replace function public.guest_claim_cap()
returns int language sql immutable as $$ select 500 $$;

create or replace function public.claim_guest_progress(p_points int, p_solved jsonb)
returns table (claimed boolean, granted int, balance int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_granted int;
  v_item    jsonb;
  v_seconds int;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  -- Claiming marks the profile in the same statement that checks it, so two
  -- parallel calls cannot both succeed.
  update public.profiles
    set guest_claimed_at = now()
    where id = v_user and guest_claimed_at is null;

  if not found then
    claimed := false;
    granted := 0;
    select points_balance into balance from public.profiles where id = v_user;
    return next;
    return;
  end if;

  v_granted := least(greatest(coalesce(p_points, 0), 0), public.guest_claim_cap());

  -- Solved puzzles carry over as records only: they pay out nothing, so there
  -- is nothing to gain by inventing them.
  for v_item in
    select value from jsonb_array_elements(coalesce(p_solved, '[]'::jsonb))
  loop
    continue when v_item->>'puzzle_id' is null or v_item->>'difficulty' is null;
    continue when (v_item->>'difficulty') not in ('easy', 'medium', 'hard', 'expert');
    continue when not exists (select 1 from public.puzzles where id = v_item->>'puzzle_id');

    v_seconds := greatest(coalesce((v_item->>'seconds')::int, 0), 1);

    insert into public.puzzle_progress
      (user_id, puzzle_id, difficulty, seconds, best_seconds, completed_count, updated_at)
    values
      (v_user, v_item->>'puzzle_id', v_item->>'difficulty', v_seconds, v_seconds, 1, now())
    on conflict (user_id, puzzle_id, difficulty) do update
      set best_seconds = least(
            coalesce(puzzle_progress.best_seconds, excluded.best_seconds),
            excluded.best_seconds
          );
  end loop;

  if v_granted > 0 then
    insert into public.point_transactions (user_id, delta, reason)
    values (v_user, v_granted, 'guest');

    update public.profiles
      set points_balance = points_balance + v_granted
      where id = v_user
      returning points_balance into balance;
  else
    select points_balance into balance from public.profiles where id = v_user;
  end if;

  claimed := true;
  granted := v_granted;
  return next;
end;
$$;

revoke all on function public.claim_guest_progress(int, jsonb) from public;
grant execute on function public.claim_guest_progress(int, jsonb) to authenticated;
