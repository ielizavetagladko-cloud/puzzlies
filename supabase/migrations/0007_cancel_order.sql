-- Unfinished payments.
--
-- Safe to run more than once.
--
-- A buyer who opens the payment page and walks away leaves an order sitting at
-- 'pending' forever. That is worth showing them — with a way to finish it, and
-- a way to say they changed their mind.

alter table public.orders
  drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('pending', 'paid', 'failed', 'refunded', 'cancelled'));

/**
 * Lets a buyer abandon their own unpaid order.
 *
 * Narrow on purpose. Orders are readable by their owner but not writable —
 * an UPDATE policy would let a browser set status = 'paid' on itself. This
 * touches one row, only the caller's, only while it is still unpaid, and only
 * to say it was abandoned.
 *
 * Cancelling does not close the door on the money: if WayForPay reports the
 * payment approved afterwards, fulfil_order still credits it. A buyer's guess
 * about what happened never outranks the provider's.
 */
create or replace function public.cancel_order(p_provider_ref text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows int;
begin
  update public.orders
     set status = 'cancelled'
   where provider_ref = p_provider_ref
     and user_id = auth.uid()
     and status = 'pending';

  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

revoke all on function public.cancel_order(text) from public;
grant execute on function public.cancel_order(text) to authenticated;
