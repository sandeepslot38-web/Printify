-- Additional milestones and scan details used by the customer tracking view.
alter type public.order_state add value if not exists 'out_for_delivery' after 'shipped';
alter table public.orders
  add column if not exists estimated_delivery_at date,
  add column if not exists current_location text;
