-- Customer dashboard shipment details. Staff can update these fields as an order is fulfilled.
alter table public.orders
  add column if not exists carrier_name text,
  add column if not exists tracking_number text,
  add column if not exists tracking_url text;

alter table public.orders
  add constraint orders_tracking_url_http_check
  check (tracking_url is null or tracking_url ~ '^https?://') not valid;
