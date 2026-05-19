const KEY_BEST = "draw_game_best_score";
const KEY_STATS = "draw_game_stats";

export interface GameStats {
  gamesPlayed: number;
  totalScore: number;
  bestScore: number;
}

export function getBestScore(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(KEY_BEST) ?? "0", 10);
}

export function saveBestScore(score: number): void {
  const current = getBestScore();
  if (score > current) localStorage.setItem(KEY_BEST, String(score));
}

export function getStats(): GameStats {
  if (typeof window === "undefined") return { gamesPlayed: 0, totalScore: 0, bestScore: 0 };
  try {
    return JSON.parse(localStorage.getItem(KEY_STATS) ?? "{}") as GameStats;
  } catch {
    return { gamesPlayed: 0, totalScore: 0, bestScore: 0 };
  }
}

export function saveGameResult(score: number): void {
  const stats = getStats();
  stats.gamesPlayed = (stats.gamesPlayed ?? 0) + 1;
  stats.totalScore = (stats.totalScore ?? 0) + score;
  stats.bestScore = Math.max(stats.bestScore ?? 0, score);
  localStorage.setItem(KEY_STATS, JSON.stringify(stats));
  saveBestScore(score);
}
