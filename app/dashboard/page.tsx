"use client";

import AppShell from "@/components/AppShell";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getDailyWord, getTodayDate } from "@/lib/daily";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

const MODES = [
  {
    id: "classic",
    icon: "🎨",
    title: "Классика",
    desc: "Рисуй слово — бот угадывает. Бот рисует — угадываешь ты.",
    href: "/game",
    available: true,
  },
  {
    id: "speed",
    icon: "⚡",
    title: "Быстрый раунд",
    desc: "10 секунд на рисунок — молниеносный темп.",
    href: "#",
    available: false,
    badge: "Скоро",
  },
  {
    id: "vs",
    icon: "👥",
    title: "Мультиплеер",
    desc: "Играй против живых игроков в реальном времени.",
    href: "#",
    available: false,
    badge: "Фаза 3",
  },
  {
    id: "endless",
    icon: "♾️",
    title: "Бесконечный",
    desc: "Без лимита раундов — играй, пока хватает сил.",
    href: "#",
    available: false,
    badge: "Скоро",
  },
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

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-10">

        {/* ── Welcome ── */}
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--text)" }}>
            Привет, {profile?.nickname ?? "Игрок"}! {profile?.avatar}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text2)" }}>
            Выбери режим и начинай играть
          </p>
        </div>

        {/* ── Game modes ── */}
        <section className="flex flex-col gap-4">
          <p
            className="text-xs uppercase tracking-widest font-semibold"
            style={{ color: "var(--text3)" }}
          >
            Режимы игры
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MODES.map((m) => (
              <div
                key={m.id}
                className={`relative rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200 ${
                  m.available ? "hover:-translate-y-0.5 cursor-pointer" : "opacity-60"
                }`}
                style={{
                  background: m.available ? "var(--surface)" : "var(--item-bg)",
                  border: m.available
                    ? "1px solid var(--border-accent)"
                    : "1px solid var(--border)",
                  boxShadow: m.available ? "0 1px 2px rgba(31,28,22,0.04)" : "none",
                }}
              >
                {/* Coming-soon badge */}
                {"badge" in m && (
                  <span
                    className="absolute top-3 right-3 text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: "var(--subtle-bg)",
                      border: "1px solid var(--border)",
                      color: "var(--text3)",
                    }}
                  >
                    {m.badge}
                  </span>
                )}

                <span className="text-3xl select-none leading-none">{m.icon}</span>

                <div>
                  <p className="font-black text-base" style={{ color: "var(--text)" }}>{m.title}</p>
                  <p
                    className="text-sm mt-1 leading-snug"
                    style={{ color: "var(--text2)" }}
                  >
                    {m.desc}
                  </p>
                </div>

                {m.available ? (
                  <Link
                    href={m.href}
                    className="mt-auto btn-primary w-full py-2.5 rounded-xl text-sm font-bold text-white text-center"
                  >
                    Играть →
                  </Link>
                ) : (
                  <div
                    className="mt-auto py-2.5 rounded-xl text-sm font-semibold text-center"
                    style={{ background: "var(--subtle-bg)", color: "var(--text3)" }}
                  >
                    Недоступно
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Daily challenge ── */}
        <section className="flex flex-col gap-4">
          <p
            className="text-xs uppercase tracking-widest font-semibold"
            style={{ color: "var(--text3)" }}
          >
            Челлендж дня
          </p>
          <div
            className="rounded-2xl p-5 flex items-center gap-4"
            style={{
              background: "var(--accent-dim)",
              border: "1px solid var(--border-accent)",
            }}
          >
            <span className="text-4xl select-none shrink-0">📅</span>
            <div className="flex-1 min-w-0">
              <p className="font-black text-base" style={{ color: "var(--text)" }}>
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
                className="btn-primary px-5 py-2.5 rounded-xl font-bold text-white text-sm shrink-0"
              >
                Играть
              </Link>
            )}
          </div>
        </section>

        {/* ── Quick stats ── */}
        {profile && (
          <section className="flex flex-col gap-4">
            <p
              className="text-xs uppercase tracking-widest font-semibold"
              style={{ color: "var(--text3)" }}
            >
              Твоя статистика
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Лучший счёт",  value: profile.best_score,              color: "var(--accent)" },
                { label: "Всего очков",  value: profile.total_score,             color: "var(--text)"   },
                { label: "Игр сыграно", value: profile.games_played,            color: "var(--text)"   },
                { label: "Стрик",        value: `${profile.current_streak} дн.`, color: "var(--accent)" },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="rounded-xl p-4 text-center"
                  style={{ background: "var(--item-bg)", border: "1px solid var(--border)" }}
                >
                  <p className="text-xl font-black" style={{ color }}>{value}</p>
                  <p className="text-xs mt-1 font-semibold" style={{ color: "var(--text3)" }}>
                    {label}
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
