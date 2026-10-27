-- Culture Lab ecommerce baseline. Apply with `supabase db push`.
create extension if not exists pgcrypto;

create type public.product_state as enum ('active','draft','archived','sold_out');
create type public.payment_state as enum ('pending','verified','failed','cancelled','simulated','refunded');
create type public.order_state as enum ('pending','confirmed','processing','shipped','delivered','cancelled','refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', phone text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('customer','admin')) default 'customer', created_at timestamptz not null default now()
);
create table public.categories (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, description text not null default '', cover_path text, is_visible boolean not null default true, sort_order integer not null default 0, created_at timestamptz not null default now()
);
create table public.collections (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, description text not null default '', cover_path text, desktop_banner_path text, mobile_banner_path text, status text not null default 'draft' check(status in ('draft','published','archived')), sort_order integer not null default 0, published_at timestamptz, created_at timestamptz not null default now()
);
create table public.products (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, description text not null default '', category_id uuid references public.categories(id), sku text unique, tags text[] not null default '{}', price_inr integer not null check(price_inr >= 0), compare_at_inr integer check(compare_at_inr is null or compare_at_inr >= price_inr), status public.product_state not null default 'draft', material text not null default '', featured boolean not null default false, bestseller boolean not null default false, trending boolean not null default false, new_arrival boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.product_variants (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade, sku text unique, size text not null, stock integer not null default 0 check(stock >= 0), created_at timestamptz not null default now(), unique(product_id,size)
);
create table public.media_assets (
  id uuid primary key default gen_random_uuid(), bucket text not null, storage_path text not null unique, media_type text not null check(media_type in ('image','video')), mime_type text not null, file_name text not null, bytes bigint not null check(bytes >= 0), width integer, height integer, alt_text text not null default '', caption text not null default '', is_public boolean not null default true, uploaded_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table public.product_images (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade, media_id uuid not null references public.media_assets(id), sort_order integer not null default 0, is_primary boolean not null default false, unique(product_id,media_id)
);
create table public.product_videos (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade, media_id uuid not null references public.media_assets(id), poster_media_id uuid references public.media_assets(id), captions text, sort_order integer not null default 0
);
create table public.collection_products (
  collection_id uuid not null references public.collections(id) on delete cascade, product_id uuid not null references public.products(id) on delete cascade, sort_order integer not null default 0, primary key(collection_id,product_id)
);
create table public.homepage_sections (
  id uuid primary key default gen_random_uuid(), section_type text not null, title text not null default '', content jsonb not null default '{}', is_enabled boolean not null default true, sort_order integer not null default 0, publication_state text not null default 'draft' check(publication_state in ('draft','published')), published_at timestamptz, updated_at timestamptz not null default now()
);
create table public.campaigns (
  id uuid primary key default gen_random_uuid(), name text not null, headline text not null default '', subtitle text not null default '', cta_label text, destination text, desktop_media_id uuid references public.media_assets(id), mobile_media_id uuid references public.media_assets(id), video_media_id uuid references public.media_assets(id), placement text not null default 'homepage', priority integer not null default 0, starts_at timestamptz, ends_at timestamptz, status text not null default 'draft' check(status in ('draft','scheduled','active','expired','archived')), created_at timestamptz not null default now()
);
create table public.site_settings (
  key text primary key, value jsonb not null default '{}', updated_at timestamptz not null default now()
);
create table public.addresses (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, full_name text not null, phone text not null, line1 text not null, line2 text not null default '', city text not null, state text not null, postal_code text not null, country text not null default 'India', created_at timestamptz not null default now()
);
create table public.wishlists (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, product_id uuid not null references public.products(id) on delete cascade, created_at timestamptz not null default now(), unique(user_id,product_id)
);
create table public.coupons (
  id uuid primary key default gen_random_uuid(), code text not null unique, kind text not null check(kind in ('percentage','fixed')), amount integer not null check(amount > 0), max_discount_inr integer, minimum_order_inr integer not null default 0, usage_limit integer, used_count integer not null default 0, starts_at timestamptz, expires_at timestamptz, active boolean not null default false
);
create table public.orders (
  id uuid primary key default gen_random_uuid(), order_number text not null unique, user_id uuid references auth.users(id), email text not null, phone text not null, address_snapshot jsonb not null, status public.order_state not null default 'pending', currency text not null default 'INR', subtotal_inr integer not null check(subtotal_inr >= 0), discount_inr integer not null default 0 check(discount_inr >= 0), shipping_inr integer not null default 0 check(shipping_inr >= 0), total_inr integer not null check(total_inr >= 0), coupon_code text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade, product_id uuid references public.products(id) on delete set null, variant_id uuid references public.product_variants(id) on delete set null, product_snapshot jsonb not null, quantity integer not null check(quantity > 0), unit_price_inr integer not null check(unit_price_inr >= 0), size text not null
);
create table public.payments (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id), provider text not null check(provider in ('razorpay','cod','simulated')), provider_order_id text, provider_payment_id text unique, state public.payment_state not null default 'pending', amount_inr integer not null check(amount_inr >= 0), verified_at timestamptz, created_at timestamptz not null default now()
);
create table public.order_status_history (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade, status public.order_state not null, note text not null default '', changed_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(), coupon_id uuid not null references public.coupons(id), order_id uuid not null references public.orders(id), user_id uuid references auth.users(id), created_at timestamptz not null default now(), unique(coupon_id,order_id)
);
create table public.reviews (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade, user_id uuid references auth.users(id), display_name text not null, rating integer not null check(rating between 1 and 5), body text not null, status text not null default 'pending' check(status in ('pending','approved','rejected')), created_at timestamptz not null default now()
);
create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(), email text not null unique, consented_at timestamptz not null default now(), unsubscribed_at timestamptz
);
create table public.publication_history (
  id uuid primary key default gen_random_uuid(), entity_type text not null, entity_id uuid not null, snapshot jsonb not null, published_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(), admin_id uuid references auth.users(id), action text not null, entity_type text not null, entity_id text, details jsonb not null default '{}', created_at timestamptz not null default now()
);

-- The storefront may read intentionally public media. Only a user with an admin
-- role can write to the bucket; private assets should use a separate bucket.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('storefront-media','storefront-media',true,52428800,array['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm'])
on conflict(id) do nothing;
create policy storefront_media_public_read on storage.objects for select using(bucket_id='storefront-media');
create policy storefront_media_admin_insert on storage.objects for insert with check(bucket_id='storefront-media' and public.is_admin());
create policy storefront_media_admin_update on storage.objects for update using(bucket_id='storefront-media' and public.is_admin()) with check(bucket_id='storefront-media' and public.is_admin());
create policy storefront_media_admin_delete on storage.objects for delete using(bucket_id='storefront-media' and public.is_admin());

create index products_public_catalog on public.products(status,created_at desc);
create index variants_product_stock on public.product_variants(product_id,stock);
create index orders_customer on public.orders(user_id,created_at desc);
create index orders_number on public.orders(order_number);
create index payments_order_state on public.payments(order_id,state);
create index campaigns_placement_schedule on public.campaigns(placement,status,starts_at,ends_at);
create index media_assets_type_date on public.media_assets(media_type,created_at desc);
create index reviews_approved on public.reviews(product_id,status,created_at desc);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin') $$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.categories enable row level security;
alter table public.collections enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.media_assets enable row level security;
alter table public.product_images enable row level security;
alter table public.product_videos enable row level security;
alter table public.collection_products enable row level security;
alter table public.homepage_sections enable row level security;
alter table public.campaigns enable row level security;
alter table public.site_settings enable row level security;
alter table public.addresses enable row level security;
alter table public.wishlists enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.order_status_history enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.reviews enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.publication_history enable row level security;
alter table public.admin_audit_logs enable row level security;

create policy profiles_self_read on public.profiles for select using(id=auth.uid() or public.is_admin());
create policy profiles_self_update on public.profiles for update using(id=auth.uid() or public.is_admin()) with check(id=auth.uid() or public.is_admin());
create policy roles_self_read on public.user_roles for select using(user_id=auth.uid() or public.is_admin());
create policy roles_admin_manage on public.user_roles for all using(public.is_admin()) with check(public.is_admin());
create policy categories_public_read on public.categories for select using(is_visible or public.is_admin());
create policy collections_public_read on public.collections for select using(status='published' or public.is_admin());
create policy products_public_read on public.products for select using(status='active' or public.is_admin());
create policy variants_public_read on public.product_variants for select using(exists(select 1 from public.products p where p.id=product_id and p.status='active') or public.is_admin());
create policy product_images_public_read on public.product_images for select using(exists(select 1 from public.products p where p.id=product_id and p.status='active') or public.is_admin());
create policy product_videos_public_read on public.product_videos for select using(exists(select 1 from public.products p where p.id=product_id and p.status='active') or public.is_admin());
create policy collection_products_public_read on public.collection_products for select using(exists(select 1 from public.collections c where c.id=collection_id and c.status='published') or public.is_admin());
create policy media_public_read on public.media_assets for select using((is_public and public.is_admin() is false) or public.is_admin());
create policy homepage_public_read on public.homepage_sections for select using(publication_state='published' or public.is_admin());
create policy campaigns_public_read on public.campaigns for select using(status='active' or public.is_admin());
create policy settings_public_read on public.site_settings for select using(key not like 'private.%' or public.is_admin());
create policy addresses_self_all on public.addresses for all using(user_id=auth.uid() or public.is_admin()) with check(user_id=auth.uid() or public.is_admin());
create policy wishlist_self_all on public.wishlists for all using(user_id=auth.uid() or public.is_admin()) with check(user_id=auth.uid() or public.is_admin());
create policy coupon_public_validate on public.coupons for select using(active or public.is_admin());
create policy orders_owner_read on public.orders for select using(user_id=auth.uid() or public.is_admin());
create policy order_items_owner_read on public.order_items for select using(exists(select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or public.is_admin())));
create policy payments_owner_read on public.payments for select using(exists(select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or public.is_admin())));
create policy order_history_owner_read on public.order_status_history for select using(exists(select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or public.is_admin())));
create policy coupon_redemptions_owner_read on public.coupon_redemptions for select using(user_id=auth.uid() or public.is_admin());
create policy reviews_public_approved on public.reviews for select using(status='approved' or user_id=auth.uid() or public.is_admin());
create policy reviews_customer_insert on public.reviews for insert with check(user_id=auth.uid());
create policy newsletter_customer_insert on public.newsletter_subscribers for insert with check(true);
create policy publication_admin_read on public.publication_history for select using(public.is_admin());
create policy audit_admin_read on public.admin_audit_logs for select using(public.is_admin());

-- Admin write access policies. Sensitive order/payment mutations stay in server-side functions.
do $$ declare t text; begin
  foreach t in array array['categories','collections','products','product_variants','media_assets','product_images','product_videos','collection_products','homepage_sections','campaigns','site_settings','coupons','reviews','publication_history','admin_audit_logs'] loop
    execute format('create policy %I on public.%I for all using(public.is_admin()) with check(public.is_admin())', t||'_admin_write', t);
  end loop;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$ begin
  insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''));
  insert into public.user_roles(user_id,role) values(new.id,'customer');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
