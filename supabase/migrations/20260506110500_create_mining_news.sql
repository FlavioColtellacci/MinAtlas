create extension if not exists pgcrypto;

create table if not exists public.mining_news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null unique,
  description text,
  source_name text,
  source_favicon_url text,
  thumbnail_url text,
  published_at timestamptz,
  category text not null check (category in ('australia', 'global', 'relevant')),
  created_at timestamptz not null default now()
);

create index if not exists mining_news_category_published_at_idx
  on public.mining_news (category, published_at desc nulls last, created_at desc);

alter table public.mining_news enable row level security;

drop policy if exists "Public read mining_news" on public.mining_news;
create policy "Public read mining_news"
  on public.mining_news
  for select
  to anon, authenticated
  using (true);
