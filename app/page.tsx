"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const STEPS = [
  { n: "01", title: "Рисуй слово", desc: "Тридцать секунд на набросок: карандаш, лист, воображение." },
  { n: "02", title: "Нейросеть угадывает", desc: "Модель распознаёт рисунок прямо в браузере, по ходу штрихов." },
  { n: "03", title: "Бот рисует в ответ", desc: "Смотри, как он выводит линии, и угадывай раньше, чем он закончит." },
  { n: "04", title: "Скорость решает", desc: "Чем быстрее ответ, тем выше место в таблице." },
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
      <div className="min-h-dvh flex items-center justify-center">
        <span className="text-3xl float select-none">🎨</span>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col">

      {/* ── Top navbar ──────────────────────────────────────── */}
      <header
        className="fixed top-0 inset-x-0 h-16 flex items-center"
        style={{ background: "var(--navbar-bg)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--border)", zIndex: "var(--z-nav)" }}
      >
        <div className="max-w-5xl mx-auto w-full px-6 flex items-center gap-3">
          <span className="text-lg select-none">🎨</span>
          <span className="font-extrabold tracking-tight" style={{ color: "var(--text)" }}>Draw &amp; Guess</span>
          <div className="flex-1" />
          <Link
            href="/auth"
            className="text-sm font-semibold px-4 py-2 rounded-lg transition-colors hover:bg-[var(--item-bg)]"
            style={{ color: "var(--text2)" }}
          >
            Войти
          </Link>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="flex-1 flex items-center pt-16">
        <div className="max-w-5xl mx-auto w-full px-6 py-20 sm:py-28">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold mb-5" style={{ color: "var(--accent)" }}>
              Игра на распознавание рисунков
            </p>

            <h1
              className="font-extrabold tracking-tight"
              style={{ color: "var(--text)", fontSize: "clamp(2.6rem, 7vw, 4.75rem)", lineHeight: 1.02, textWrap: "balance" }}
            >
              Рисуй слово —{" "}
              <span className="relative inline-block">
                нейросеть&nbsp;угадывает
                <svg
                  className="absolute left-0 -bottom-2 w-full" height="14" viewBox="0 0 300 14"
                  fill="none" preserveAspectRatio="none" aria-hidden
                >
                  <path d="M2 9 C 60 3, 110 12, 160 6 S 250 3, 298 8"
                    stroke="var(--accent)" strokeWidth="3.5" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            <p className="mt-8 text-lg sm:text-xl max-w-md leading-relaxed" style={{ color: "var(--text2)" }}>
              Рисуешь — бот угадывает. Бот рисует — угадываешь ты. Без загрузок, прямо в браузере.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/auth"
                className="btn-primary px-7 py-3.5 rounded-xl text-base font-bold text-white inline-block"
              >
                Начать играть
              </Link>
              <span className="text-sm" style={{ color: "var(--text3)" }}>
                Бесплатно · регистрация за полминуты
              </span>
            </div>

            {/* Live stats */}
            {stats && (stats.players > 0 || stats.games > 0) && (
              <div className="mt-12 flex gap-10">
                {stats.players > 0 && (
                  <div>
                    <p className="text-3xl font-extrabold tabular-nums" style={{ color: "var(--text)" }}>
                      {stats.players.toLocaleString("ru")}
                    </p>
                    <p className="text-sm font-medium mt-0.5" style={{ color: "var(--text3)" }}>игроков</p>
                  </div>
                )}
                {stats.games > 0 && (
                  <div>
                    <p className="text-3xl font-extrabold tabular-nums" style={{ color: "var(--text)" }}>
                      {stats.games.toLocaleString("ru")}
                    </p>
                    <p className="text-sm font-medium mt-0.5" style={{ color: "var(--text3)" }}>партий сыграно</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Game preview ─────────────────────────────────────── */}
      <section className="w-full" style={{ borderTop: "1px solid var(--border)", background: "var(--bg2)" }}>
        <div className="max-w-5xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight mb-3" style={{ color: "var(--text)" }}>
              Узнавание на лету
            </h2>
            <p className="text-base leading-relaxed max-w-sm" style={{ color: "var(--text2)" }}>
              Пока ты ведёшь линию, модель уже строит догадки и обновляет их с каждым штрихом.
              Чем точнее рисунок, тем увереннее ответ.
            </p>
          </div>

          {/* Canvas mockup */}
          <div className="glass p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-6">
            <div
              className="w-full sm:w-44 h-44 rounded-xl flex items-center justify-center shrink-0 relative overflow-hidden"
              style={{ background: "#fff", border: "1px solid var(--border-strong)" }}
            >
              <svg viewBox="0 0 200 160" className="absolute inset-0 w-full h-full">
                <path d="M60,110 Q80,60 100,55 Q120,50 140,90 Q155,120 130,130 Q100,145 70,130 Z"
                  fill="none" stroke="#211d17" strokeWidth="3.5" strokeLinecap="round" />
                <circle cx="85"  cy="82" r="5" fill="#211d17" />
                <circle cx="115" cy="80" r="5" fill="#211d17" />
                <path d="M88,100 Q100,112 112,100" fill="none" stroke="#211d17" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>

            <div className="flex-1 w-full flex flex-col gap-2.5">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text3)" }}>
                бот думает
              </p>
              {[
                { label: "Кот",    pct: 94, correct: true  },
                { label: "Кролик", pct: 38, correct: false },
                { label: "Мишка",  pct: 21, correct: false },
              ].map(({ label, pct, correct }) => (
                <div key={label} className="flex items-center gap-3">
                  <span
                    className="w-14 text-sm font-semibold shrink-0"
                    style={{ color: correct ? "var(--green)" : "var(--text2)" }}
                  >
                    {correct && "✓ "}{label}
                  </span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--item-bg)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: correct ? "var(--green)" : "var(--text3)" }}
                    />
                  </div>
                  <span className="text-xs font-semibold tabular-nums w-8 text-right" style={{ color: "var(--text3)" }}>
                    {pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <section className="w-full max-w-5xl mx-auto px-6 py-24">
        <h2 className="text-2xl font-extrabold tracking-tight mb-12" style={{ color: "var(--text)" }}>
          Как это работает
        </h2>
        <div className="flex flex-col">
          {STEPS.map(({ n, title, desc }, i) => (
            <div
              key={n}
              className="grid grid-cols-[auto_1fr] sm:grid-cols-[5rem_1fr] gap-5 sm:gap-8 py-7"
              style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
            >
              <span className="text-2xl font-extrabold tabular-nums" style={{ color: "var(--accent)" }}>{n}</span>
              <div className="max-w-md">
                <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text)" }}>{title}</h3>
                <p className="text-base leading-relaxed" style={{ color: "var(--text2)" }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section className="w-full" style={{ borderTop: "1px solid var(--border)", background: "var(--bg2)" }}>
        <div className="max-w-5xl mx-auto px-6 py-20 flex flex-col items-start gap-5">
          <h2 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--text)", textWrap: "balance" }}>
            Готов проверить, насколько понятно ты рисуешь?
          </h2>
          <Link
            href="/auth"
            className="btn-primary px-7 py-3.5 rounded-xl text-base font-bold text-white inline-block"
          >
            Создать профиль
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid var(--border)" }}>
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm" style={{ color: "var(--text3)" }}>
          <span className="font-semibold" style={{ color: "var(--text2)" }}>🎨 Draw &amp; Guess</span>
          <span>© {new Date().getFullYear()}</span>
          <div className="flex-1" />
          <Link href="/auth" className="hover:text-[var(--text)] transition-colors">Войти</Link>
        </div>
      </footer>

    </div>
  );
}
