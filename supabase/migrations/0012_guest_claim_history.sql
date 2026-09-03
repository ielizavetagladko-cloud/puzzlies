-- The guest claim left no trace when it carried over zero bonus points.
--
-- Safe to run more than once.
--
-- claim_guest_progress() writes carried-over solves straight into
-- puzzle_progress, so "5 solved, 2:34 total" appears on the stats tiles
-- immediately. But the history list reads point_transactions, and the
-- function only ever wrote one row there — the capped bonus, and only when it
-- was greater than zero. A guest whose balance never rose above the welcome
-- bonus got real solved-puzzle records and an empty history explaining none
-- of them: the numbers on the page had no story behind them.
--
-- Each carried puzzle now leaves its own zero-delta entry, the same shape a
-- normal solve leaves, so the history reads as "these are the pictures that
-- came with you" — honest about paying nothing twice, but no longer silent
-- about what happened.
create or replace function public.claim_guest_progress(p_points int, p_solved jsonb)
returns table (claimed boolean, granted int, balance int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user      uuid := auth.uid();
  v_granted   int;
  v_item      jsonb;
  v_seconds   int;
  v_puzzle_id text;
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
  -- is nothing to gain by inventing them. Each still gets its own history
  -- entry, at zero, so the collection and the stats tiles have something to
  -- point back to.
  for v_item in
    select value from jsonb_array_elements(coalesce(p_solved, '[]'::jsonb))
  loop
    continue when v_item->>'puzzle_id' is null or v_item->>'difficulty' is null;
    continue when (v_item->>'difficulty') not in ('easy', 'medium', 'hard', 'expert');

    v_puzzle_id := v_item->>'puzzle_id';
    continue when not exists (select 1 from public.puzzles where id = v_puzzle_id);

    v_seconds := greatest(coalesce((v_item->>'seconds')::int, 0), 1);

    insert into public.puzzle_progress
      (user_id, puzzle_id, difficulty, seconds, best_seconds, completed_count, updated_at)
    values
      (v_user, v_puzzle_id, v_item->>'difficulty', v_seconds, v_seconds, 1, now())
    on conflict (user_id, puzzle_id, difficulty) do update
      set best_seconds = least(
            coalesce(puzzle_progress.best_seconds, excluded.best_seconds),
            excluded.best_seconds
          );

    insert into public.point_transactions (user_id, delta, reason, puzzle_id)
    values (v_user, 0, 'guest', v_puzzle_id);
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
