-- ============================================================================
-- ROUH Perfumes (رُوح للعطور) — Supabase Cloud Database & Security Setup
-- Paste this entire script into: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Safe to re-run (idempotent).
-- ============================================================================

create extension if not exists pgcrypto;

-- 1. PRODUCTS TABLE
create table if not exists public.products (
  id text primary key,
  name text not null,
  brand text not null default 'ROUH & CO.',
  category text not null default 'mirror-men',
  category_name text not null default 'عطور فاخرة',
  gender text not null default 'unisex' check (gender in ('men', 'women', 'unisex')),
  price numeric not null check (price >= 0),
  compare_at_price numeric check (compare_at_price is null or compare_at_price >= 0),
  size text not null default '100 ml',
  notes text[] not null default '{}',
  description text not null default '',
  image text not null default 'batch1_images/img_002.webp',
  in_stock boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 1000,
  updated_at timestamptz not null default now()
);

-- 2. COUPONS TABLE
create table if not exists public.coupons (
  code text primary key,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric not null check (discount_value > 0),
  min_order numeric not null default 0 check (min_order >= 0),
  is_active boolean not null default true,
  uses_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- 3. ORDERS TABLE
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text unique not null,
  customer_name text not null check (char_length(trim(customer_name)) >= 2),
  phone text not null check (char_length(trim(phone)) >= 8),
  governorate text not null,
  address text not null check (char_length(trim(address)) >= 5),
  notes text not null default '',
  items jsonb not null,
  subtotal numeric not null check (subtotal >= 0),
  shipping_fee numeric not null default 0 check (shipping_fee >= 0),
  discount_amount numeric not null default 0 check (discount_amount >= 0),
  coupon_code text,
  total numeric not null check (total >= 0),
  status text not null default 'new' check (status in ('new', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_orders_status on public.orders (status);

-- 4. STORE SETTINGS TABLE (Single Row id = 1)
create table if not exists public.store_settings (
  id integer primary key default 1 check (id = 1),
  announcement_text text not null default 'شحن لجميع محافظات مصر — معاينة قبل الاستلام',
  messenger_url text not null default 'https://m.me/rouh.perfumes.eg',
  whatsapp_number text not null default '',
  shipping_cairo_giza numeric not null default 60,
  shipping_alex_delta numeric not null default 70,
  shipping_upper_canal numeric not null default 85,
  free_shipping_threshold numeric not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.store_settings (id)
values (1)
on conflict (id) do nothing;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
alter table public.products enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.store_settings enable row level security;

-- Products policies
drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
  on public.products for select
  to anon
  using (is_active = true);

drop policy if exists "Admin full access to products" on public.products;
create policy "Admin full access to products"
  on public.products for all
  to authenticated
  using (true)
  with check (true);

-- Coupons policies (hidden from public select; validated safely via RPC)
drop policy if exists "Admin full access to coupons" on public.coupons;
create policy "Admin full access to coupons"
  on public.coupons for all
  to authenticated
  using (true)
  with check (true);

-- Orders policies (public can ONLY submit new orders; only admin can read/update/delete)
drop policy if exists "Public can place new orders" on public.orders;
create policy "Public can place new orders"
  on public.orders for insert
  to anon, authenticated
  with check (status = 'new' and total >= 0);

drop policy if exists "Admin can view orders" on public.orders;
create policy "Admin can view orders"
  on public.orders for select
  to authenticated
  using (true);

drop policy if exists "Admin can update orders" on public.orders;
create policy "Admin can update orders"
  on public.orders for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Admin can delete orders" on public.orders;
create policy "Admin can delete orders"
  on public.orders for delete
  to authenticated
  using (true);

-- Store Settings policies
drop policy if exists "Public can read store settings" on public.store_settings;
create policy "Public can read store settings"
  on public.store_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "Admin can update store settings" on public.store_settings;
create policy "Admin can update store settings"
  on public.store_settings for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================================
-- SECURE COUPON VALIDATION RPC & USAGE COUNTER TRIGGER
-- ============================================================================
create or replace function public.validate_coupon(p_code text, p_subtotal numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean text;
  v_coupon public.coupons%rowtype;
  v_discount numeric;
begin
  v_clean := upper(trim(coalesce(p_code, '')));
  if v_clean = '' then
    return jsonb_build_object('valid', false, 'message', 'برجاء إدخال كود الخصم أولاً');
  end if;

  select * into v_coupon
  from public.coupons
  where upper(trim(code)) = v_clean
    and is_active = true
  limit 1;

  if not found then
    return jsonb_build_object('valid', false, 'message', 'كود الخصم غير صحيح أو منتهي الصلاحية');
  end if;

  if coalesce(p_subtotal, 0) < v_coupon.min_order then
    return jsonb_build_object(
      'valid', false,
      'message', 'الحد الأدنى لاستخدام هذا الكود هو ' || v_coupon.min_order || ' ج.م'
    );
  end if;

  if v_coupon.discount_type = 'percent' then
    v_discount := round((coalesce(p_subtotal, 0) * least(v_coupon.discount_value, 100) / 100.0)::numeric, 0);
  else
    v_discount := least(v_coupon.discount_value, coalesce(p_subtotal, 0));
  end if;

  return jsonb_build_object(
    'valid', true,
    'code', v_coupon.code,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'discount_amount', v_discount,
    'message', 'تم تطبيق كود الخصم بنجاح'
  );
end;
$$;

grant execute on function public.validate_coupon(text, numeric) to anon, authenticated;

create or replace function public.increment_coupon_uses()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.coupon_code is not null and trim(new.coupon_code) <> '' then
    update public.coupons
    set uses_count = uses_count + 1
    where upper(trim(code)) = upper(trim(new.coupon_code));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_increment_coupon_uses on public.orders;
create trigger trg_increment_coupon_uses
  after insert on public.orders
  for each row execute function public.increment_coupon_uses();

-- ============================================================================
-- EXPLICIT TABLE GRANTS FOR NEW SUPABASE PROJECTS
-- ============================================================================
grant usage on schema public to anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant insert on public.orders to anon, authenticated;
grant select, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.coupons to authenticated;
grant select on public.store_settings to anon, authenticated;
grant insert, update on public.store_settings to authenticated;

-- ============================================================================
-- STORAGE BUCKET FOR UPLOADED PRODUCT PHOTOS
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read product images" on storage.objects;
create policy "Public read product images"
  on storage.objects for select
  to public
  using (bucket_id = 'product-images');

drop policy if exists "Admin upload product images" on storage.objects;
create policy "Admin upload product images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images');

drop policy if exists "Admin update product images" on storage.objects;
create policy "Admin update product images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images');

drop policy if exists "Admin delete product images" on storage.objects;
create policy "Admin delete product images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images');
