-- Idempotent migration for an EXISTING database.
-- Run this in Supabase → SQL Editor if the tables from supabase-schema.sql
-- already exist. Safe to run multiple times.

-- ── CHECK constraints (defense-in-depth against absurd/negative scores) ──────
alter table public.game_results  drop constraint if exists game_results_score_chk;
alter table public.game_results  add  constraint game_results_score_chk
  check (score >= 0 and score <= 1000000);

alter table public.game_results  drop constraint if exists game_results_rounds_chk;
alter table public.game_results  add  constraint game_results_rounds_chk
  check (rounds_played >= 1);

alter table public.daily_results  drop constraint if exists daily_results_score_chk;
alter table public.daily_results  add  constraint daily_results_score_chk
  check (score >= 0 and score <= 1000000);

-- ── daily_results UPDATE policy (needed for the best-score upsert) ───────────
drop policy if exists "daily_results_update" on public.daily_results;
create policy "daily_results_update" on public.daily_results
  for update using (auth.uid() = user_id);

-- ── Private rooms (challenge a friend) ──────────────────────────────────────
create table if not exists public.rooms (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,
  words      text[] not null,
  creator_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.room_results (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid references public.rooms(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,
  nickname   text not null,
  avatar     text default '🎨',
  score      integer not null check (score >= 0 and score <= 1000000),
  created_at timestamptz default now(),
  unique(room_id, user_id)
);

alter table public.rooms        enable row level security;
alter table public.room_results enable row level security;

drop policy if exists "rooms_select" on public.rooms;
create policy "rooms_select" on public.rooms for select using (true);
drop policy if exists "rooms_insert" on public.rooms;
create policy "rooms_insert" on public.rooms for insert with check (auth.uid() = creator_id);

drop policy if exists "room_results_select" on public.room_results;
create policy "room_results_select" on public.room_results for select using (true);
drop policy if exists "room_results_insert" on public.room_results;
create policy "room_results_insert" on public.room_results for insert with check (auth.uid() = user_id);
drop policy if exists "room_results_update" on public.room_results;
create policy "room_results_update" on public.room_results for update using (auth.uid() = user_id);
