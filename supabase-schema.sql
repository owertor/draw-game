-- Run this in Supabase → SQL Editor

-- Profiles
create table public.profiles (
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
create table public.game_results (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  score        integer not null,
  rounds_played integer default 1,
  created_at   timestamptz default now()
);

-- Daily challenge results (one per user per day)
create table public.daily_results (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  date       date not null default current_date,
  score      integer not null,
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- User achievements
create table public.user_achievements (
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
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Game results: public read, owner insert
create policy "game_results_select" on public.game_results for select using (true);
create policy "game_results_insert" on public.game_results for insert with check (auth.uid() = user_id);

-- Daily results: public read, owner insert
create policy "daily_results_select" on public.daily_results for select using (true);
create policy "daily_results_insert" on public.daily_results for insert with check (auth.uid() = user_id);

-- Achievements: public read, owner insert
create policy "achievements_select" on public.user_achievements for select using (true);
create policy "achievements_insert" on public.user_achievements for insert with check (auth.uid() = user_id);
