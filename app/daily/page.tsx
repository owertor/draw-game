"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { getDailyWord, getTodayDate } from "@/lib/daily";
import AppShell from "@/components/AppShell";

interface Hist { date: string; score: number; }

export default function DailyPage() {
  const { user } = useAuth();
  const word = getDailyWord();
  const [loading, setLoading]   = useState(true);
  const [score, setScore]       = useState<number | null>(null);
  const [rank, setRank]         = useState<number | null>(null);
  const [players, setPlayers]   = useState(0);
  const [history, setHistory]   = useState<Hist[]>([]);

  useEffect(() => {
    if (!user) return;
    const today = getTodayDate();

    (async () => {
      const [{ count: total }, { data: mine }, { data: hist }] = await Promise.all([
        supabase.from("daily_results").select("id", { count: "exact", head: true }).eq("date", today),
        supabase.from("daily_results").select("score").eq("user_id", user.id).eq("date", today).maybeSingle(),
        supabase.from("daily_results").select("date, score").eq("user_id", user.id).order("date", { ascending: false }).limit(10),
      ]);
      setPlayers(total ?? 0);
      setHistory((hist as Hist[]) ?? []);

      if (mine) {
        setScore(mine.score);
        const { count: better } = await supabase
          .from("daily_results")
          .select("id", { count: "exact", head: true })
          .eq("date", today)
          .gt("score", mine.score);
        setRank((better ?? 0) + 1);
      }
      setLoading(false);
    })();
  }, [user]);

  const played = score !== null;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-10 sm:py-14 flex flex-col gap-14">

        {/* ── Header ── */}
        <header>
          <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "var(--accent)" }}>
            Челлендж дня
          </p>
          <h1 className="font-extrabold tracking-tight" style={{ color: "var(--text)", fontSize: "clamp(1.9rem, 4vw, 2.6rem)", lineHeight: 1.05 }}>
            Одно слово для всех
          </h1>
          <p className="mt-2 text-base max-w-md" style={{ color: "var(--text2)" }}>
            Одна попытка в день. Завтра — новое слово и новая попытка.
          </p>
        </header>

        {/* ── Today ── */}
        <section>
          {loading ? (
            <p style={{ color: "var(--text2)" }}>Загрузка…</p>
          ) : played ? (
            <div className="flex flex-col gap-7">
              <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text3)" }}>
                Сыграно сегодня
              </p>
              <div className="flex flex-wrap gap-y-8" style={{ borderTop: "1px solid var(--border)", paddingTop: "1.75rem" }}>
                <div className="flex-1 min-w-[8rem]">
                  <p className="font-extrabold tabular-nums leading-none" style={{ color: "var(--accent)", fontSize: "clamp(2.4rem, 6vw, 3.5rem)" }}>
                    {score}
                  </p>
                  <p className="text-sm font-medium mt-2" style={{ color: "var(--text3)" }}>очков</p>
                </div>
                {rank && (
                  <div className="flex-1 min-w-[8rem]">
                    <p className="font-extrabold tabular-nums leading-none" style={{ color: "var(--text)", fontSize: "clamp(2.4rem, 6vw, 3.5rem)" }}>
                      #{rank}
                    </p>
                    <p className="text-sm font-medium mt-2" style={{ color: "var(--text3)" }}>из {players}</p>
                  </div>
                )}
              </div>
              <p className="text-sm" style={{ color: "var(--text2)" }}>
                Возвращайся завтра за новым словом
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text3)" }}>
                  Слово дня
                </p>
                <p className="font-extrabold tracking-tight" style={{ color: "var(--text)", fontSize: "clamp(2.6rem, 8vw, 4.5rem)", lineHeight: 1 }}>
                  «{word.ru}»
                </p>
              </div>
              {players > 0 && (
                <p className="text-sm" style={{ color: "var(--text3)" }}>
                  {players} игроков уже сыграли сегодня
                </p>
              )}
              <Link
                href="/game?daily=true"
                className="btn-primary self-start px-8 py-3.5 rounded-xl text-base font-bold text-white"
              >
                Играть →
              </Link>
            </div>
          )}
        </section>

        {/* ── History ── */}
        <section className="flex flex-col gap-5">
          <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--text3)" }}>
            История
          </p>
          {history.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text2)" }}>
              {loading ? "Загрузка…" : "Сыграй челлендж — здесь появится история"}
            </p>
          ) : (
            <div className="flex flex-col">
              {history.map((h, i) => (
                <div
                  key={h.date}
                  className="flex items-center justify-between py-3.5"
                  style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
                >
                  <span className="text-sm font-medium" style={{ color: "var(--text2)" }}>
                    {new Date(h.date + "T00:00:00Z").toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                  </span>
                  <span className="text-base font-extrabold tabular-nums" style={{ color: "var(--accent)" }}>
                    {h.score}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </AppShell>
  );
}
