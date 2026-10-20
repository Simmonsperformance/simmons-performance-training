alter table public.digital_orders drop constraint if exists digital_orders_delivery_status_check;
alter table public.digital_orders
  add constraint digital_orders_delivery_status_check
  check (delivery_status in ('pending', 'delivering', 'delivered', 'failed', 'unknown', 'awaiting_manual'));

update public.digital_products
set name = 'PERSONALIZED ATHLETE NUTRITION GUIDE'
where id = 'athlete-nutrition-guide';

create or replace function public.claim_digital_order_delivery(
  p_order_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.digital_orders%rowtype;
begin
  select * into v_order
  from public.digital_orders
  where id = p_order_id
  for update;

  if not found then
    return null;
  end if;

  if p_action = 'confirm_payment'
    and v_order.payment_status = 'pending'
    and v_order.delivery_status = 'pending' then
    if v_order.product_id = 'athlete-nutrition-guide' then
      update public.digital_orders
      set payment_status = 'paid',
          paid_at = now(),
          delivery_status = 'awaiting_manual',
          delivery_attempt_count = 0,
          delivery_started_at = null,
          last_delivery_error = null
      where id = p_order_id
      returning * into v_order;
    else
      update public.digital_orders
      set payment_status = 'paid',
          paid_at = now(),
          delivery_status = 'delivering',
          delivery_attempt_count = delivery_attempt_count + 1,
          delivery_started_at = now(),
          last_delivery_error = null
      where id = p_order_id
      returning * into v_order;
    end if;
  elsif p_action = 'retry_delivery'
    and v_order.payment_status = 'paid'
    and v_order.delivery_status = 'failed' then
    update public.digital_orders
    set delivery_status = 'delivering',
        delivery_attempt_count = delivery_attempt_count + 1,
        delivery_started_at = now(),
        last_delivery_error = null
    where id = p_order_id
    returning * into v_order;
  elsif p_action = 'mark_manual_delivered'
    and v_order.product_id = 'athlete-nutrition-guide'
    and v_order.payment_status = 'paid'
    and v_order.delivery_status = 'awaiting_manual' then
    update public.digital_orders
    set delivery_status = 'delivered',
        delivered_at = now(),
        download_expires_at = null,
        last_delivery_error = null
    where id = p_order_id
    returning * into v_order;
  else
    return null;
  end if;

  return to_jsonb(v_order);
end;
$$;

revoke all on function public.claim_digital_order_delivery(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_digital_order_delivery(uuid, text) to service_role;
