"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { ACHIEVEMENTS } from "@/lib/achievements";
import AppShell from "@/components/AppShell";

export default function AchievementsPage() {
  const { user } = useAuth();
  const [earned, setEarned] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setEarned(new Set((data ?? []).map((r) => r.achievement_id)));
        setLoading(false);
      });
  }, [user]);

  const earnedCount = ACHIEVEMENTS.filter((a) => earned.has(a.id)).length;
  const pct = Math.round((earnedCount / ACHIEVEMENTS.length) * 100);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10 sm:py-14 flex flex-col gap-8">

        <header>
          <h1 className="font-extrabold tracking-tight" style={{ color: "var(--text)", fontSize: "clamp(1.9rem, 4vw, 2.6rem)", lineHeight: 1.05 }}>
            Достижения
          </h1>
          <p className="text-base mt-2" style={{ color: "var(--text2)" }}>
            Открыто {earnedCount} из {ACHIEVEMENTS.length}
          </p>
        </header>

        {/* Progress — slim line, no box */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--item-bg)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: "var(--accent)" }}
            />
          </div>
          <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: "var(--text3)" }}>
            {pct}%
          </span>
        </div>

        {/* Badges — borderless wall, locked dimmed */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-9">
          {ACHIEVEMENTS.map((a) => {
            const done = earned.has(a.id);
            return (
              <div
                key={a.id}
                className="flex flex-col items-center text-center gap-2"
                style={{ opacity: done || loading ? 1 : 0.4 }}
              >
                <span
                  className="text-5xl select-none leading-none"
                  style={{ filter: done ? "none" : "grayscale(1)" }}
                >
                  {a.emoji}
                </span>
                <p className="text-sm font-bold leading-tight mt-1" style={{ color: "var(--text)" }}>
                  {a.title}
                </p>
                <p className="text-xs leading-snug max-w-[14rem]" style={{ color: "var(--text2)" }}>
                  {a.description}
                </p>
                <span
                  className="text-[11px] font-semibold uppercase tracking-wider mt-0.5"
                  style={{ color: done ? "var(--accent)" : "var(--text3)" }}
                >
                  {done ? "Открыто" : "Закрыто"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
