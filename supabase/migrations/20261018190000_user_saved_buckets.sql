-- ─── user_saved_buckets ──────────────────────────────────────────────────────
create table if not exists public.user_saved_buckets (
  user_id   uuid not null references auth.users(id) on delete cascade,
  bucket_id uuid not null references public.buckets(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, bucket_id)
);

alter table public.user_saved_buckets enable row level security;

create policy "user_saved_buckets_select"
  on public.user_saved_buckets for select using (auth.uid() = user_id);

create policy "user_saved_buckets_insert"
  on public.user_saved_buckets for insert with check (auth.uid() = user_id);

create policy "user_saved_buckets_delete"
  on public.user_saved_buckets for delete using (auth.uid() = user_id);

create index if not exists idx_user_saved_buckets_user_id on public.user_saved_buckets(user_id);
create index if not exists idx_user_saved_buckets_bucket_id on public.user_saved_buckets(bucket_id);
