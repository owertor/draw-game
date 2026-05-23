"use client";

import { useEffect, useState } from "react";
import { supabase, type Profile } from "@/lib/supabase";
import { getTodayDate } from "@/lib/daily";
import { useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";

interface LeaderboardEntry extends Pick<Profile, "nickname" | "avatar" | "best_score" | "games_played"> {
  id: string;
}

interface DailyEntry {
  score: number;
  profiles: Pick<Profile, "nickname" | "avatar"> | null;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [tab,     setTab]     = useState<"alltime" | "daily">("alltime");
  const [allTime, setAllTime] = useState<LeaderboardEntry[]>([]);
  const [daily,   setDaily]   = useState<DailyEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase
        .from("profiles")
        .select("id, nickname, avatar, best_score, games_played")
        .order("best_score", { ascending: false })
        .limit(50),
      supabase
        .from("daily_results")
        .select("score, profiles(nickname, avatar)")
        .eq("date", getTodayDate())
        .order("score", { ascending: false })
        .limit(50),
    ]).then(([at, dl]) => {
      setAllTime((at.data as LeaderboardEntry[]) ?? []);
      setDaily((dl.data as unknown as DailyEntry[]) ?? []);
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
            {(tab === "alltime" ? allTime : daily).length === 0 && (
              <p className="text-center py-4 text-sm" style={{ color: "var(--text2)" }}>
                {tab === "daily"
                  ? "Никто ещё не играл сегодня — будь первым!"
                  : "Пока нет результатов"}
              </p>
            )}

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

            {tab === "daily" && daily.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: i % 2 === 0 ? "var(--subtle-bg)" : "transparent" }}
              >
                <span className="w-6 text-center text-sm font-bold" style={{ color: "var(--text3)" }}>
                  {medals[i] ?? `${i + 1}`}
                </span>
                <span className="text-xl select-none">{r.profiles?.avatar ?? "🎨"}</span>
                <span className="flex-1 text-sm font-semibold" style={{ color: "var(--text)" }}>
                  {r.profiles?.nickname ?? "Игрок"}
                </span>
                <span className="text-sm font-black tabular-nums" style={{ color: "var(--yellow)" }}>
                  {r.score}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
