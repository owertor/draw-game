"use client";

import AppShell from "@/components/AppShell";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getDailyWord, getTodayDate } from "@/lib/daily";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

const COMING = [
  { id: "speed",   icon: "⚡",  title: "Быстрый раунд", desc: "10 секунд на рисунок", badge: "Скоро"   },
  { id: "vs",      icon: "👥",  title: "Мультиплеер",   desc: "Против живых игроков", badge: "Фаза 3"  },
  { id: "endless", icon: "♾️", title: "Бесконечный",   desc: "Без лимита раундов",   badge: "Скоро"   },
] as const;

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const dailyWord = getDailyWord();
  const [dailyDone,    setDailyDone]    = useState(false);
  const [dailyScore,   setDailyScore]   = useState<number | null>(null);
  const [dailyPlayers, setDailyPlayers] = useState(0);

  useEffect(() => {
    const today = getTodayDate();
    supabase
      .from("daily_results")
      .select("id", { count: "exact", head: true })
      .eq("date", today)
      .then(({ count }) => setDailyPlayers(count ?? 0));

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

  const stats = profile && [
    { label: "Лучший счёт", value: profile.best_score,             accent: true  },
    { label: "Всего очков", value: profile.total_score,            accent: false },
    { label: "Игр сыграно", value: profile.games_played,           accent: false },
    { label: "Стрик",       value: `${profile.current_streak} дн.`, accent: true  },
  ];

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10 sm:py-14 flex flex-col gap-14">

        {/* ── Welcome ── */}
        <header>
          <h1 className="font-extrabold tracking-tight" style={{ color: "var(--text)", fontSize: "clamp(1.9rem, 4vw, 2.6rem)", lineHeight: 1.05 }}>
            Привет, {profile?.nickname ?? "Игрок"} {profile?.avatar}
          </h1>
          <p className="mt-2 text-base" style={{ color: "var(--text2)" }}>
            Выбери режим и начинай играть
          </p>
        </header>

        {/* ── Primary mode: Классика (editorial hero) ── */}
        <section className="flex flex-col gap-5">
          <Link
            href="/game"
            className="group rounded-2xl p-7 sm:p-9 flex flex-col sm:flex-row sm:items-center gap-6 transition-transform hover:-translate-y-0.5"
            style={{ background: "var(--surface)", border: "1px solid var(--border-accent)", boxShadow: "0 1px 2px rgba(31,28,22,0.04)" }}
          >
            <span className="text-5xl sm:text-6xl select-none leading-none shrink-0">🎨</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-widest font-semibold mb-1.5" style={{ color: "var(--accent)" }}>
                Доступно сейчас
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
                Классика
              </h2>
              <p className="text-sm sm:text-base mt-2 max-w-md leading-relaxed" style={{ color: "var(--text2)" }}>
                Рисуй слово — бот угадывает. Бот рисует — угадываешь ты.
              </p>
            </div>
            <span className="btn-primary px-8 py-3.5 rounded-xl text-base font-bold text-white text-center shrink-0">
              Играть →
            </span>
          </Link>

          {/* Coming-soon modes — quiet, secondary weight */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {COMING.map((m) => (
              <div
                key={m.id}
                className="rounded-xl px-4 py-3.5 flex items-center gap-3"
                style={{ background: "var(--subtle-bg)", border: "1px solid var(--border)" }}
              >
                <span className="text-xl select-none shrink-0" style={{ filter: "grayscale(0.5)", opacity: 0.7 }}>
                  {m.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold leading-tight truncate" style={{ color: "var(--text2)" }}>{m.title}</p>
                  <p className="text-xs leading-tight mt-0.5 truncate" style={{ color: "var(--text3)" }}>{m.desc}</p>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider shrink-0" style={{ color: "var(--text3)" }}>
                  {m.badge}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Daily challenge ── */}
        <section className="flex flex-col gap-4">
          <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--text3)" }}>
            Челлендж дня
          </p>
          <div
            className="rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4"
            style={{ background: "var(--accent-dim)", border: "1px solid var(--border-accent)" }}
          >
            <span className="text-4xl select-none shrink-0">📅</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base sm:text-lg" style={{ color: "var(--text)" }}>
                {dailyDone
                  ? `Сыграно · ${dailyScore} очков`
                  : `Слово дня: «${dailyWord.ru}»`}
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--text2)" }}>
                {dailyDone
                  ? "Возвращайся завтра за новым словом"
                  : "Одна попытка в день — для всех одно слово"}
              </p>
              {dailyPlayers > 0 && (
                <p className="text-xs mt-1" style={{ color: "var(--text3)" }}>
                  {dailyPlayers} игроков сыграли сегодня
                </p>
              )}
            </div>
            {!dailyDone && (
              <Link
                href="/game?daily=true"
                className="btn-primary px-6 py-3 rounded-xl font-bold text-white text-sm shrink-0 text-center"
              >
                Играть
              </Link>
            )}
          </div>
        </section>

        {/* ── Stats (editorial figure row, no boxes) ── */}
        {stats && (
          <section className="flex flex-col gap-5">
            <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--text3)" }}>
              Твоя статистика
            </p>
            <div
              className="flex flex-wrap gap-y-8"
              style={{ borderTop: "1px solid var(--border)", paddingTop: "1.75rem" }}
            >
              {stats.map((s) => (
                <div key={s.label} className="flex-1 min-w-[7rem]">
                  <p
                    className="font-extrabold tabular-nums leading-none"
                    style={{ color: s.accent ? "var(--accent)" : "var(--text)", fontSize: "clamp(1.8rem, 4vw, 2.5rem)" }}
                  >
                    {s.value}
                  </p>
                  <p className="text-sm font-medium mt-2" style={{ color: "var(--text3)" }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </AppShell>
  );
}
