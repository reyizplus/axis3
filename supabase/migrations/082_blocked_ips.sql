-- Blocked IPs table for admin security
create table if not exists public.blocked_ips (
  id uuid primary key default gen_random_uuid(),
  ip_address text not null,
  reason text,
  blocked_by uuid references public.users(id) on delete set null,
  blocked_at timestamptz not null default now(),
  expires_at timestamptz,
  is_active boolean not null default true
);

-- Index for quick lookup
create index if not exists idx_blocked_ips_ip_active
  on public.blocked_ips(ip_address, is_active)
  where is_active = true;

-- Index for expiry cleanup
create index if not exists idx_blocked_ips_expires
  on public.blocked_ips(expires_at)
  where is_active = true and expires_at is not null;

-- Enable RLS
alter table public.blocked_ips enable row level security;

-- Only admins can read/write
create policy "Admins can read blocked_ips"
  on public.blocked_ips for select
  using (public.is_admin());

create policy "Admins can insert blocked_ips"
  on public.blocked_ips for insert
  with check (public.is_admin());

create policy "Admins can update blocked_ips"
  on public.blocked_ips for update
  using (public.is_admin());

create policy "Admins can delete blocked_ips"
  on public.blocked_ips for delete
  using (public.is_admin());
