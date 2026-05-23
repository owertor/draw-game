import { WORD_LIST } from "./word-list";
import type { WordEntry } from "./word-list";

/** Today's date as YYYY-MM-DD in UTC. */
export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

/** Deterministic daily word based on UTC date — same for every player worldwide. */
export function getDailyWord(): WordEntry {
  const utcMs    = Date.UTC(...(new Date().toISOString().split("T")[0].split("-").map(Number) as [number, number, number]));
  const dayIndex = Math.floor(utcMs / 86_400_000);
  return WORD_LIST[dayIndex % WORD_LIST.length];
}
