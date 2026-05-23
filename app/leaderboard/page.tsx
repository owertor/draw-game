"use client";

import { useEffect, useState } from "react";
import { supabase, type Profile } from "@/lib/supabase";
import { getTodayDate } from "@/lib/daily";
import { useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";

interface LeaderboardEntry extends Pick<Profile, "nickname" | "avatar" | "best_score" | "games_played"> {
  id: string;
}

interface TodayEntry {
  user_id: string;
  score:   number;
  nickname: string;
  avatar:   string;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [tab,     setTab]     = useState<"alltime" | "daily">("alltime");
  const [allTime, setAllTime] = useState<LeaderboardEntry[]>([]);
  const [today,   setToday]   = useState<TodayEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const todayStr = getTodayDate();

    Promise.all([
      // ── All-time: best score per profile ──
      supabase
        .from("profiles")
        .select("id, nickname, avatar, best_score, games_played")
        .order("best_score", { ascending: false })
        .limit(50),

      // ── Today: top scores from game_results created today ──
      supabase
        .from("game_results")
        .select("user_id, score")
        .gte("created_at", `${todayStr}T00:00:00.000Z`)
        .order("score", { ascending: false })
        .limit(200),     // fetch more so we can deduplicate per user
    ]).then(async ([at, gr]) => {
      setAllTime((at.data as LeaderboardEntry[]) ?? []);

      // Deduplicate: keep the best score per user
      const bestByUser = new Map<string, number>();
      for (const r of (gr.data ?? []) as { user_id: string; score: number }[]) {
        if ((bestByUser.get(r.user_id) ?? -1) < r.score) {
          bestByUser.set(r.user_id, r.score);
        }
      }

      if (bestByUser.size === 0) { setToday([]); setLoading(false); return; }

      // Fetch profiles for those users
      const userIds = [...bestByUser.keys()];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, nickname, avatar")
        .in("id", userIds);

      const entries: TodayEntry[] = [...bestByUser.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50)
        .map(([userId, score]) => {
          const p = (profilesData ?? []).find((x) => x.id === userId);
          return { user_id: userId, score, nickname: p?.nickname ?? "Игрок", avatar: p?.avatar ?? "🎨" };
        });

      setToday(entries);
      setLoading(false);
    });
  }, []);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">

        <h1 className="text-2xl font-black text-gradient">Лидерборд</h1>

        {/* Tabs */}
        <div className="flex rounded-xl p-1 gap-1" style={{ background: "var(--item-bg)" }}>
          {(["alltime", "daily"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: tab === t ? "var(--accent)" : "transparent",
                color:      tab === t ? "#fff" : "var(--text2)",
              }}
            >
              {t === "alltime" ? "🏆 Все времена" : "📅 Сегодня"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="glass p-8 text-center" style={{ color: "var(--text2)" }}>Загрузка…</div>
        ) : (
          <div className="glass p-4 flex flex-col gap-2">
            {(tab === "alltime" ? allTime : today).length === 0 && (
              <p className="text-center py-4 text-sm" style={{ color: "var(--text2)" }}>
                {tab === "daily"
                  ? "Никто ещё не играл сегодня — будь первым!"
                  : "Пока нет результатов"}
              </p>
            )}

            {/* ── All-time ── */}
            {tab === "alltime" && allTime.map((p, i) => {
              const isMe = user && p.id === user.id;
              return (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                  style={{
                    background: isMe ? "rgba(99,102,241,0.1)" : i % 2 === 0 ? "var(--subtle-bg)" : "transparent",
                    border:     isMe ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                  }}
                >
                  <span className="w-6 text-center text-sm font-bold" style={{ color: "var(--text3)" }}>
                    {medals[i] ?? `${i + 1}`}
                  </span>
                  <span className="text-xl select-none">{p.avatar}</span>
                  <span className="flex-1 text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {p.nickname}{isMe && <span style={{ color: "var(--accent-bright)" }}> (ты)</span>}
                  </span>
                  <span className="text-sm font-black tabular-nums" style={{ color: "var(--yellow)" }}>
                    {p.best_score}
                  </span>
                </div>
              );
            })}

            {/* ── Today ── */}
            {tab === "daily" && today.map((r, i) => {
              const isMe = user && r.user_id === user.id;
              return (
                <div key={r.user_id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                  style={{
                    background: isMe ? "rgba(99,102,241,0.1)" : i % 2 === 0 ? "var(--subtle-bg)" : "transparent",
                    border:     isMe ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                  }}
                >
                  <span className="w-6 text-center text-sm font-bold" style={{ color: "var(--text3)" }}>
                    {medals[i] ?? `${i + 1}`}
                  </span>
                  <span className="text-xl select-none">{r.avatar}</span>
                  <span className="flex-1 text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {r.nickname}{isMe && <span style={{ color: "var(--accent-bright)" }}> (ты)</span>}
                  </span>
                  <span className="text-sm font-black tabular-nums" style={{ color: "var(--yellow)" }}>
                    {r.score}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
