alter table public.buckets
  add column if not exists counter_enabled boolean not null default false,
  add column if not exists counter_count integer not null default 0,
  add column if not exists counter_label text,
  add column if not exists counter_target integer;
