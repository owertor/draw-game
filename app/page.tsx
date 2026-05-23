"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getDailyWord, getTodayDate } from "@/lib/daily";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const HOW_TO = [
  { icon: "✏️", title: "Рисуй слово",     sub: "30 секунд на рисунок"  },
  { icon: "🤖", title: "Бот угадывает",   sub: "в реальном времени"    },
  { icon: "👁️", title: "Бот рисует",      sub: "угадай как можно быстрее" },
  { icon: "⚡", title: "Очки за скорость", sub: "чем раньше — тем больше" },
];

export default function Home() {
  const { user, profile, loading } = useAuth();
  const dailyWord   = getDailyWord();
  const [dailyDone,    setDailyDone]    = useState(false);
  const [dailyScore,   setDailyScore]   = useState<number | null>(null);
  const [dailyPlayers, setDailyPlayers] = useState<number>(0);

  useEffect(() => {
    const today = getTodayDate();
    // Count today's daily players
    supabase
      .from("daily_results")
      .select("id", { count: "exact", head: true })
      .eq("date", today)
      .then(({ count }) => setDailyPlayers(count ?? 0));

    // Check if current user already played today
    if (!user) return;
    supabase
      .from("daily_results")
      .select("score")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle()
      .then(({ data }) => {
        if (data) { setDailyDone(true); setDailyScore(data.score); }
      });
  }, [user]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-8 p-4 relative overflow-hidden">

      {/* Glow blobs */}
      <div className="absolute pointer-events-none" style={{
        top: "5%", left: "50%", transform: "translateX(-50%)",
        width: 480, height: 320,
        background: "radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, transparent 70%)",
        filter: "blur(40px)",
      }} />
      <div className="absolute pointer-events-none" style={{
        bottom: "5%", right: "5%", width: 300, height: 200,
        background: "radial-gradient(ellipse, rgba(139,92,246,0.12) 0%, transparent 70%)",
        filter: "blur(40px)",
      }} />

      {/* Hero */}
      <div className="text-center relative z-10 flex flex-col items-center gap-3">
        <div className="text-6xl float select-none">🎨</div>
        <h1 className="text-6xl font-black tracking-tight text-gradient">Draw &amp; Guess</h1>
        <p className="text-base font-medium" style={{ color: "var(--text2)" }}>
          Рисуй — бот угадывает. Бот рисует — угадываешь ты.
        </p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3 relative z-10">

        {/* Auth bar */}
        {!loading && (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}
          >
            {user && profile ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{profile.avatar}</span>
                  <div>
                    <p className="text-sm font-bold leading-tight" style={{ color: "var(--text)" }}>{profile.nickname}</p>
                    <p className="text-xs" style={{ color: "var(--text3)" }}>🏆 {profile.best_score} очков</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href="/profile" className="text-xs px-3 py-1.5 rounded-lg font-semibold hover:opacity-80"
                    style={{ background: "var(--accent-dim)", border: "1px solid var(--border-accent)", color: "var(--accent-bright)" }}>
                    Профиль
                  </Link>
                  <Link href="/leaderboard" className="text-xs px-3 py-1.5 rounded-lg font-semibold hover:opacity-80"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text2)" }}>
                    🏆
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm" style={{ color: "var(--text2)" }}>Войди чтобы сохранять результаты</p>
                <Link href="/auth" className="text-xs px-3 py-1.5 rounded-lg font-semibold hover:opacity-80"
                  style={{ background: "var(--accent)", color: "#fff" }}>
                  Войти
                </Link>
              </>
            )}
          </div>
        )}

        {/* Daily challenge */}
        <div className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)" }}
        >
          <span className="text-2xl">📅</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--yellow)" }}>
              Челлендж дня
            </p>
            <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
              {dailyDone ? `Ты сыграл! ${dailyScore} очков` : `Угадай: «${dailyWord.ru}»`}
            </p>
            {dailyPlayers > 0 && (
              <p className="text-xs" style={{ color: "var(--text3)" }}>{dailyPlayers} игроков сегодня</p>
            )}
          </div>
          <Link
            href={`/game?daily=true`}
            className="text-xs px-3 py-2 rounded-xl font-bold shrink-0 hover:opacity-80"
            style={{
              background: dailyDone ? "rgba(255,255,255,0.05)" : "rgba(251,191,36,0.15)",
              border: "1px solid rgba(251,191,36,0.3)",
              color: "var(--yellow)",
              opacity: dailyDone ? 0.5 : 1,
              pointerEvents: dailyDone ? "none" : "auto",
            }}
          >
            {dailyDone ? "✓" : "Играть"}
          </Link>
        </div>

        {/* Main card */}
        <div className="glass p-5 flex flex-col gap-4">
          <Link
            href="/game"
            className="btn-primary w-full py-4 px-6 rounded-2xl text-center font-bold text-lg text-white"
          >
            Начать игру →
          </Link>

          <div className="grid grid-cols-2 gap-2.5">
            {HOW_TO.map(({ icon, title, sub }) => (
              <div key={title} className="rounded-xl p-3"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="text-xl mb-1">{icon}</div>
                <p className="text-sm font-semibold text-white leading-tight">{title}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>{sub}</p>
              </div>
            ))}
          </div>

          <Link href="/leaderboard"
            className="w-full py-2.5 rounded-xl text-center text-sm font-semibold hover:opacity-80 transition-opacity"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", color: "var(--text2)" }}
          >
            🏆 Таблица лидеров
          </Link>
        </div>

      </div>
    </main>
  );
}
