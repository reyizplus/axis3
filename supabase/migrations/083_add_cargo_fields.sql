-- Add cargo fields to orders table
alter table public.orders
  add column if not exists cargo_company text,
  add column if not exists cargo_status text default 'pending',
  add column if not exists cargo_price decimal(10,2),
  add column if not exists share_tracking_link boolean default true;

-- Index for cargo tracking queries
create index if not exists idx_orders_cargo_company
  on public.orders(cargo_company)
  where cargo_company is not null;

create index if not exists idx_orders_cargo_status
  on public.orders(cargo_status);
