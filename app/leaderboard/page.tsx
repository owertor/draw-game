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

  // Normalise the active tab into a uniform shape for rendering.
  const rows = (tab === "alltime"
    ? allTime.map((p) => ({
        key: p.id, isMe: !!user && p.id === user.id,
        avatar: p.avatar, name: p.nickname, score: p.best_score,
        sub: `${p.games_played} игр`,
      }))
    : today.map((r) => ({
        key: r.user_id, isMe: !!user && r.user_id === user.id,
        avatar: r.avatar, name: r.nickname, score: r.score, sub: null as string | null,
      })));

  const podiumOrder = [1, 0, 2]; // render 2nd · 1st · 3rd

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">

        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--text)" }}>Лидерборд</h1>

        {/* Tabs */}
        <div className="flex rounded-xl p-1 gap-1" style={{ background: "var(--item-bg)" }}>
          {(["alltime", "daily"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
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
          <div className="glass p-12 text-center" style={{ color: "var(--text2)" }}>Загрузка…</div>
        ) : rows.length === 0 ? (
          <div className="glass p-12 text-center text-sm" style={{ color: "var(--text2)" }}>
            {tab === "daily" ? "Никто ещё не играл сегодня — стань первым" : "Пока нет результатов"}
          </div>
        ) : (
          <div className="flex flex-col gap-6">

            {/* Podium for the top 3 (when there are at least 3 players) */}
            {rows.length >= 3 && (
              <div className="grid grid-cols-3 gap-3 items-end">
                {podiumOrder.map((idx) => {
                  const r = rows[idx];
                  const first = idx === 0;
                  return (
                    <div key={r.key}
                      className="flex flex-col items-center gap-1.5 rounded-2xl px-2 py-4"
                      style={{
                        background: r.isMe ? "var(--accent-dim)" : "var(--item-bg)",
                        border: `1px solid ${first || r.isMe ? "var(--border-accent)" : "var(--border)"}`,
                        transform: first ? "translateY(-12px)" : "none",
                        boxShadow: first ? "0 2px 10px rgba(31,28,22,0.08)" : "none",
                      }}
                    >
                      <span className={first ? "text-3xl" : "text-2xl"}>{medals[idx]}</span>
                      <span className={first ? "text-5xl leading-none select-none" : "text-4xl leading-none select-none"}>{r.avatar}</span>
                      <span className="text-sm font-bold text-center truncate w-full px-1" style={{ color: "var(--text)" }}>
                        {r.name}{r.isMe && <span style={{ color: "var(--accent)" }}> (ты)</span>}
                      </span>
                      <span className={`${first ? "text-xl" : "text-lg"} font-black tabular-nums`} style={{ color: "var(--accent)" }}>
                        {r.score}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Champion hero card when there are only 1–2 players (a podium would look broken) */}
            {rows.length > 0 && rows.length < 3 && (
              <div className="rounded-2xl p-6 flex items-center gap-5"
                style={{
                  background: rows[0].isMe ? "var(--accent-dim)" : "var(--item-bg)",
                  border: "1px solid var(--border-accent)",
                  boxShadow: "0 2px 10px rgba(31,28,22,0.08)",
                }}
              >
                <span className="text-6xl leading-none select-none shrink-0">{rows[0].avatar}</span>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs uppercase tracking-widest font-bold" style={{ color: "var(--accent)" }}>🥇 Чемпион</span>
                  <span className="text-2xl font-black truncate" style={{ color: "var(--text)" }}>
                    {rows[0].name}{rows[0].isMe && <span style={{ color: "var(--accent)" }}> (ты)</span>}
                  </span>
                  {rows[0].sub && <span className="text-xs" style={{ color: "var(--text3)" }}>{rows[0].sub}</span>}
                </div>
                <span className="ml-auto text-3xl font-black tabular-nums" style={{ color: "var(--accent)" }}>{rows[0].score}</span>
              </div>
            )}

            {/* List of the remaining players (after the highlighted top) */}
            {(() => {
              const rest = rows.length >= 3 ? rows.slice(3) : rows.slice(1);
              const startRank = rows.length >= 3 ? 4 : 2;
              if (rest.length === 0) return null;
              return (
                <div className="glass p-3 flex flex-col gap-1.5">
                  {rest.map((r, i) => {
                    const rank = startRank + i;
                    return (
                      <div key={r.key} className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all"
                        style={{
                          background: r.isMe ? "var(--accent-dim)" : i % 2 === 0 ? "var(--subtle-bg)" : "transparent",
                          border:     r.isMe ? "1px solid var(--border-accent)" : "1px solid transparent",
                        }}
                      >
                        <span className="w-7 text-center text-sm font-bold tabular-nums" style={{ color: "var(--text3)" }}>
                          {medals[rank - 1] ?? rank}
                        </span>
                        <span className="text-2xl leading-none select-none">{r.avatar}</span>
                        <span className="flex-1 min-w-0 truncate text-sm font-semibold" style={{ color: "var(--text)" }}>
                          {r.name}{r.isMe && <span style={{ color: "var(--accent)" }}> (ты)</span>}
                        </span>
                        {r.sub && (
                          <span className="text-xs hidden sm:block" style={{ color: "var(--text3)" }}>{r.sub}</span>
                        )}
                        <span className="text-sm font-black tabular-nums w-16 text-right" style={{ color: "var(--accent)" }}>
                          {r.score}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </AppShell>
  );
}
