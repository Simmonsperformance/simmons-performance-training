create table if not exists public.digital_products (
  id text primary key,
  name text not null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'USD' check (currency = 'USD'),
  storage_path text,
  orderable boolean not null default false,
  unavailable_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not orderable or storage_path is not null)
);

insert into public.digital_products
  (id, name, amount_cents, storage_path, orderable, unavailable_reason)
values
  ('athlete-nutrition-guide', 'SIMMONS PERFORMANCE ATHLETE NUTRITION GUIDE', 3000,
   'athlete-nutrition-guide/Simmons_Performance_Athlete_Nutrition_Guide_PREMIUM.pdf', true, null),
  ('muscle-building-nutrition-guide', 'SIMMONS PERFORMANCE MUSCLE-BUILDING NUTRITION GUIDE', 3000,
   'muscle-building-nutrition-guide/Simmons_Performance_Muscle_Building_Nutrition_Guide_PREMIUM.pdf', true, null),
  ('fat-loss-nutrition-guide', 'SIMMONS PERFORMANCE FAT-LOSS NUTRITION GUIDE', 3000,
   'fat-loss-nutrition-guide/Simmons_Performance_Fat_Loss_Nutrition_Guide_PREMIUM.pdf', true, null),
  ('meal-prep-grocery-guide', 'SIMMONS PERFORMANCE MEAL PREP & GROCERY GUIDE', 3000,
   'meal-prep-grocery-guide/Simmons_Performance_Meal_Prep_Grocery_Guide_PREMIUM.pdf', true, null),
  ('general-fitness-programs', 'General Fitness Programs', 5000,
   'general-fitness-programs/Simmons_Performance_General_Fitness_Programs_PREMIUM_FIXED.pdf', true, null),
  ('strength-programs', 'Strength Programs', 5000,
   null, false, 'No matching training-program PDF exists in the project yet.'),
  ('speed-agility-programs', 'Speed & Agility Programs', 5000,
   null, false, 'No matching training-program PDF exists in the project yet.'),
  ('football-performance-programs', 'Football Performance Programs', 5000,
   null, false, 'No matching training-program PDF exists in the project yet.'),
  ('training-nutrition-bundles', 'Training + Nutrition Bundles', 5000,
   null, false, 'No matching bundle PDF exists in the project yet.')
on conflict (id) do nothing;

create table if not exists public.digital_orders (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  product_id text not null references public.digital_products(id),
  product_name text not null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'USD' check (currency = 'USD'),
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  payment_method text not null check (payment_method in ('Zelle', 'In-Person / Cash')),
  notes text not null default '',
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid')),
  delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'delivering', 'delivered', 'failed', 'unknown')),
  business_notification_status text not null default 'pending'
    check (business_notification_status in ('pending', 'sent', 'failed')),
  business_notification_error text,
  delivery_attempt_count integer not null default 0 check (delivery_attempt_count >= 0),
  delivery_started_at timestamptz,
  delivered_at timestamptz,
  download_expires_at timestamptz,
  last_delivery_error text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists digital_orders_created_at_idx
  on public.digital_orders (created_at desc);
create index if not exists digital_orders_status_idx
  on public.digital_orders (payment_status, delivery_status, created_at desc);

create table if not exists public.digital_order_rate_limits (
  ip_digest text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  primary key (ip_digest, window_start)
);

alter table public.digital_products enable row level security;
alter table public.digital_orders enable row level security;
alter table public.digital_order_rate_limits enable row level security;

revoke all on table public.digital_products, public.digital_orders, public.digital_order_rate_limits from anon, authenticated;
grant all on table public.digital_products, public.digital_orders, public.digital_order_rate_limits to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'digital-products-private',
  'digital-products-private',
  false,
  52428800,
  array['application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.consume_digital_order_rate_limit(
  p_ip_digest text,
  p_window_start timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.digital_order_rate_limits (ip_digest, window_start, request_count)
  values (p_ip_digest, p_window_start, 1)
  on conflict (ip_digest, window_start) do update
    set request_count = public.digital_order_rate_limits.request_count + 1
  returning request_count into v_count;

  return v_count <= 6;
end;
$$;

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
    update public.digital_orders
    set payment_status = 'paid',
        paid_at = now(),
        delivery_status = 'delivering',
        delivery_attempt_count = delivery_attempt_count + 1,
        delivery_started_at = now(),
        last_delivery_error = null
    where id = p_order_id
    returning * into v_order;
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
  else
    return null;
  end if;

  return to_jsonb(v_order);
end;
$$;

create or replace function public.finish_digital_order_delivery(
  p_order_id uuid,
  p_status text,
  p_error text default null,
  p_download_expires_at timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('delivered', 'failed', 'unknown') then
    raise exception 'Invalid delivery status';
  end if;

  update public.digital_orders
  set delivery_status = p_status,
      delivered_at = case when p_status = 'delivered' then now() else null end,
      download_expires_at = case when p_status = 'delivered' then p_download_expires_at else null end,
      last_delivery_error = case when p_status = 'delivered' then null else left(coalesce(p_error, 'Unspecified delivery error'), 500) end
  where id = p_order_id
    and payment_status = 'paid'
    and delivery_status = 'delivering';

  return found;
end;
$$;

revoke all on function public.consume_digital_order_rate_limit(text, timestamptz) from public, anon, authenticated;
revoke all on function public.claim_digital_order_delivery(uuid, text) from public, anon, authenticated;
revoke all on function public.finish_digital_order_delivery(uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.consume_digital_order_rate_limit(text, timestamptz) to service_role;
grant execute on function public.claim_digital_order_delivery(uuid, text) to service_role;
grant execute on function public.finish_digital_order_delivery(uuid, text, text, timestamptz) to service_role;
