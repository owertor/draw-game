import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  nickname: string;
  avatar: string;
  total_score: number;
  games_played: number;
  best_score: number;
  current_streak: number;
  best_streak: number;
  last_played_date: string | null;
  created_at: string;
}

export interface GameResult {
  id: string;
  user_id: string;
  score: number;
  rounds_played: number;
  created_at: string;
}

export interface DailyResult {
  id: string;
  user_id: string;
  date: string;
  score: number;
  created_at: string;
}
