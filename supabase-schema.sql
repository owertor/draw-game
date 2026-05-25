-- Run this in Supabase → SQL Editor.
-- For a FRESH project, run this whole file.
-- If the tables already exist, run supabase-migration.sql instead (this file is
-- now safe to re-run, but `create table if not exists` will NOT add the newer
-- CHECK constraints to pre-existing tables — the migration handles that).

-- Profiles
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  nickname        text unique not null,
  avatar          text default '🎨',
  total_score     integer default 0,
  games_played    integer default 0,
  best_score      integer default 0,
  current_streak  integer default 0,
  best_streak     integer default 0,
  last_played_date date,
  created_at      timestamptz default now()
);

-- Game results
-- NOTE: scores are written by the client (RLS only checks ownership). These
-- CHECK bounds are defense-in-depth against absurd/negative values, not real
-- anti-cheat — server-side scoring would be needed for that.
create table if not exists public.game_results (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  score        integer not null check (score >= 0 and score <= 1000000),
  rounds_played integer default 1 check (rounds_played >= 1),
  created_at   timestamptz default now()
);

-- Daily challenge results (one per user per day)
create table if not exists public.daily_results (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  date       date not null default current_date,
  score      integer not null check (score >= 0 and score <= 1000000),
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- User achievements
create table if not exists public.user_achievements (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete cascade,
  achievement_id text not null,
  earned_at      timestamptz default now(),
  unique(user_id, achievement_id)
);

-- Row Level Security
alter table public.profiles         enable row level security;
alter table public.game_results     enable row level security;
alter table public.daily_results    enable row level security;
alter table public.user_achievements enable row level security;

-- Profiles: public read, owner write
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (true);
drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Game results: public read, owner insert
drop policy if exists "game_results_select" on public.game_results;
create policy "game_results_select" on public.game_results for select using (true);
drop policy if exists "game_results_insert" on public.game_results;
create policy "game_results_insert" on public.game_results for insert with check (auth.uid() = user_id);

-- Daily results: public read, owner insert/update (upsert keeps the best daily score)
drop policy if exists "daily_results_select" on public.daily_results;
create policy "daily_results_select" on public.daily_results for select using (true);
drop policy if exists "daily_results_insert" on public.daily_results;
create policy "daily_results_insert" on public.daily_results for insert with check (auth.uid() = user_id);
drop policy if exists "daily_results_update" on public.daily_results;
create policy "daily_results_update" on public.daily_results for update using (auth.uid() = user_id);

-- Achievements: public read, owner insert
drop policy if exists "achievements_select" on public.user_achievements;
create policy "achievements_select" on public.user_achievements for select using (true);
drop policy if exists "achievements_insert" on public.user_achievements;
create policy "achievements_insert" on public.user_achievements for insert with check (auth.uid() = user_id);
