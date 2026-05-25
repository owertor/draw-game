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
