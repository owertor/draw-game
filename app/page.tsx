"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";

const HOW_TO = [
  { icon: "✏️", title: "Рисуй слово",      desc: "30 секунд на рисунок — карандаш, цвет, воображение" },
  { icon: "🤖", title: "ИИ угадывает",     desc: "Нейросеть анализирует рисунок прямо в браузере" },
  { icon: "👁️", title: "Бот рисует",       desc: "Наблюдай за штрихами и угадай раньше чем бот закончит" },
  { icon: "⚡", title: "Скорость = очки",  desc: "Чем быстрее ответ — тем выше результат в таблице" },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<{ players: number; games: number } | null>(null);

  useEffect(() => {
    if (!loading && user) { router.replace("/dashboard"); return; }
  }, [user, loading, router]);

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("game_results").select("id", { count: "exact", head: true }),
    ]).then(([p, g]) => setStats({ players: p.count ?? 0, games: g.count ?? 0 }));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-3xl float select-none">🎨</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Top navbar ──────────────────────────────────────── */}
      <header
        className="fixed top-0 inset-x-0 z-50 h-16 flex items-center"
        style={{
          background:  "rgba(7,7,15,0.75)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="max-w-5xl mx-auto w-full px-6 flex items-center gap-4">
          <span className="text-xl select-none">🎨</span>
          <span className="font-black text-gradient">Draw &amp; Guess</span>
          <div className="flex-1" />
          <ThemeToggle variant="inline" />
          <Link
            href="/auth"
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
            style={{
              background: "var(--accent-dim)",
              border: "1px solid var(--border-accent)",
              color: "var(--accent-bright)",
            }}
          >
            Войти
          </Link>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col items-center justify-center pt-16 min-h-screen px-6 text-center relative overflow-hidden">

        {/* Glow blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div style={{
            position: "absolute", top: "-5%", left: "50%", transform: "translateX(-50%)",
            width: 800, height: 600,
            background: "radial-gradient(ellipse, rgba(99,102,241,0.22) 0%, transparent 60%)",
            filter: "blur(70px)",
          }} />
          <div style={{
            position: "absolute", bottom: "5%", right: "-10%",
            width: 400, height: 300,
            background: "radial-gradient(ellipse, rgba(139,92,246,0.15) 0%, transparent 65%)",
            filter: "blur(60px)",
          }} />
          <div style={{
            position: "absolute", top: "40%", left: "-10%",
            width: 350, height: 250,
            background: "radial-gradient(ellipse, rgba(99,102,241,0.10) 0%, transparent 65%)",
            filter: "blur(50px)",
          }} />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6 max-w-2xl w-full">

          <div className="text-7xl sm:text-8xl select-none float leading-none">🎨</div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-gradient leading-none">
            Draw &amp; Guess
          </h1>

          <p className="text-base sm:text-xl font-medium max-w-md" style={{ color: "var(--text2)" }}>
            Рисуй — бот угадывает.<br />
            Бот рисует — угадываешь ты.
          </p>

          <Link
            href="/auth"
            className="btn-primary mt-2 px-10 py-4 rounded-2xl text-lg font-black text-white inline-block"
          >
            Начать играть →
          </Link>

          <p className="text-sm" style={{ color: "var(--text3)" }}>
            Бесплатно · Без загрузок · Прямо в браузере
          </p>

          {/* Live stats */}
          {stats && (stats.players > 0 || stats.games > 0) && (
            <div className="flex gap-8 mt-2">
              {stats.players > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-black" style={{ color: "var(--accent-bright)" }}>
                    {stats.players.toLocaleString("ru")}
                  </p>
                  <p className="text-xs font-semibold" style={{ color: "var(--text3)" }}>игроков</p>
                </div>
              )}
              {stats.games > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-black" style={{ color: "var(--accent-bright)" }}>
                    {stats.games.toLocaleString("ru")}
                  </p>
                  <p className="text-xs font-semibold" style={{ color: "var(--text3)" }}>игр сыграно</p>
                </div>
              )}
            </div>
          )}

        </div>
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <section className="w-full max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-black text-center mb-10" style={{ color: "var(--text)" }}>
          Как это работает
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {HOW_TO.map(({ icon, title, desc }) => (
            <div
              key={title}
              className="glass-accent rounded-2xl p-5 flex flex-col gap-3"
            >
              <span className="text-3xl select-none">{icon}</span>
              <p className="font-bold text-sm" style={{ color: "var(--text)" }}>{title}</p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text2)" }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Game preview mockup ─────────────────────────────── */}
      <section className="w-full max-w-4xl mx-auto px-6 pb-20">
        <div className="glass rounded-3xl p-6 sm:p-10 flex flex-col sm:flex-row items-center gap-8">

          {/* Canvas mockup */}
          <div
            className="w-full sm:w-56 h-48 rounded-2xl flex items-center justify-center text-6xl shrink-0 select-none relative overflow-hidden"
            style={{ background: "#fff", border: "2px solid var(--border-accent)" }}
          >
            {/* simulated pencil strokes with SVG */}
            <svg viewBox="0 0 200 160" className="absolute inset-0 w-full h-full" style={{ opacity: 0.7 }}>
              <path d="M60,110 Q80,60 100,55 Q120,50 140,90 Q155,120 130,130 Q100,145 70,130 Z"
                fill="none" stroke="#333" strokeWidth="3.5" strokeLinecap="round" />
              <circle cx="85"  cy="82" r="5" fill="#333" />
              <circle cx="115" cy="80" r="5" fill="#333" />
              <path d="M88,100 Q100,112 112,100" fill="none" stroke="#333" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>

          {/* Bot guesses */}
          <div className="flex-1 w-full flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text3)" }}>
              🤖 Бот думает…
            </p>
            {[
              { label: "Кот",    pct: 94, correct: true  },
              { label: "Кролик", pct: 38, correct: false },
              { label: "Мишка",  pct: 21, correct: false },
            ].map(({ label, pct, correct }) => (
              <div key={label} className="flex items-center gap-3">
                <span
                  className="w-16 text-sm font-bold shrink-0"
                  style={{ color: correct ? "var(--green)" : "var(--text)" }}
                >
                  {correct && "✓ "}{label}
                </span>
                <div
                  className="flex-1 h-5 rounded-full overflow-hidden"
                  style={{ background: "var(--item-bg)" }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: correct
                        ? "linear-gradient(90deg,#22c55e,#4ade80)"
                        : "linear-gradient(90deg,var(--accent),var(--violet))",
                    }}
                  />
                </div>
                <span className="text-xs font-bold w-8 text-right" style={{ color: "var(--text3)" }}>
                  {pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA strip ───────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div
          className="glass max-w-lg mx-auto p-8 rounded-3xl flex flex-col items-center gap-4 text-center"
        >
          <p className="text-2xl font-black" style={{ color: "var(--text)" }}>
            Готов попробовать?
          </p>
          <p className="text-sm" style={{ color: "var(--text2)" }}>
            Создай профиль за 30 секунд и начинай играть прямо сейчас
          </p>
          <Link
            href="/auth"
            className="btn-primary px-8 py-3 rounded-xl font-bold text-white text-base"
          >
            Зарегистрироваться бесплатно →
          </Link>
        </div>
      </section>

    </div>
  );
}
