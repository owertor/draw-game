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
      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">

        <div>
          <h1 className="text-3xl font-black" style={{ color: "var(--text)" }}>Челлендж дня</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text2)" }}>
            Одна попытка в день — для всех игроков одно слово
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 items-start">

        {/* Main card */}
        <div
          className="rounded-2xl p-8 flex flex-col items-center gap-4 text-center"
          style={{ background: "var(--accent-dim)", border: "1px solid var(--border-accent)" }}
        >
          <span className="text-5xl select-none">📅</span>

          {loading ? (
            <p style={{ color: "var(--text2)" }}>Загрузка…</p>
          ) : played ? (
            <>
              <p className="font-black text-lg" style={{ color: "var(--text)" }}>
                Сыграно сегодня ✓
              </p>
              <div className="flex gap-6">
                <div>
                  <p className="text-3xl font-black" style={{ color: "var(--accent)" }}>{score}</p>
                  <p className="text-xs font-semibold" style={{ color: "var(--text3)" }}>очков</p>
                </div>
                {rank && (
                  <div>
                    <p className="text-3xl font-black" style={{ color: "var(--accent-bright)" }}>#{rank}</p>
                    <p className="text-xs font-semibold" style={{ color: "var(--text3)" }}>из {players}</p>
                  </div>
                )}
              </div>
              <p className="text-sm" style={{ color: "var(--text2)" }}>
                Возвращайся завтра за новым словом
              </p>
            </>
          ) : (
            <>
              <p className="font-black text-lg" style={{ color: "var(--text)" }}>
                Слово дня: «{word.ru}»
              </p>
              {players > 0 && (
                <p className="text-sm" style={{ color: "var(--text3)" }}>
                  {players} игроков уже сыграли сегодня
                </p>
              )}
              <Link
                href="/game?daily=true"
                className="btn-primary px-8 py-3 rounded-xl font-bold text-white"
              >
                Играть →
              </Link>
            </>
          )}
        </div>

        {/* History */}
        <div className="glass p-5 flex flex-col gap-2">
          <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--text3)" }}>
            История
          </p>
          {history.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: "var(--text2)" }}>
              {loading ? "Загрузка…" : "Сыграй челлендж — здесь появится история"}
            </p>
          ) : (
            history.map((h) => (
              <div key={h.date} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{ background: "var(--subtle-bg)" }}
              >
                <span className="text-sm font-semibold" style={{ color: "var(--text2)" }}>
                  {new Date(h.date + "T00:00:00Z").toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                </span>
                <span className="text-sm font-black tabular-nums" style={{ color: "var(--accent)" }}>
                  {h.score}
                </span>
              </div>
            ))
          )}
        </div>

        </div>
      </div>
    </AppShell>
  );
}
