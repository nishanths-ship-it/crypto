create table if not exists public.crypto_metrics_snapshots (
  id bigint generated always as identity primary key,
  asset text not null,
  as_of timestamptz not null default now(),
  current_volatility double precision not null,
  value_at_risk_95 double precision not null,
  sharpe_ratio double precision not null,
  maximum_drawdown double precision not null,
  raw_series jsonb not null
);

alter table public.crypto_metrics_snapshots enable row level security;

create policy "Authenticated users can read snapshots"
  on public.crypto_metrics_snapshots
  for select
  using (auth.role() = 'authenticated');

create policy "Service role can write snapshots"
  on public.crypto_metrics_snapshots
  for insert
  with check (auth.role() = 'service_role');
