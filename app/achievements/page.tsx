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
      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">

        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--text)" }}>Достижения</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text2)" }}>
            Открыто {earnedCount} из {ACHIEVEMENTS.length}
          </p>
        </div>

        {/* Progress bar */}
        <div className="glass p-4 flex items-center gap-4">
          <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "var(--input-bg)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: "var(--accent)" }}
            />
          </div>
          <span className="text-sm font-black tabular-nums" style={{ color: "var(--accent-bright)" }}>
            {pct}%
          </span>
        </div>

        {/* Badge grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {ACHIEVEMENTS.map((a) => {
            const done = earned.has(a.id);
            return (
              <div
                key={a.id}
                className="rounded-2xl p-4 flex flex-col items-center text-center gap-2 transition-all"
                style={{
                  background: done ? "var(--achievement-done-bg)" : "var(--item-bg)",
                  border: done ? "1px solid var(--achievement-done-border)" : "1px solid var(--border)",
                  opacity: done || loading ? 1 : 0.45,
                }}
              >
                <span
                  className="text-4xl select-none leading-none"
                  style={{ filter: done ? "none" : "grayscale(1)" }}
                >
                  {a.emoji}
                </span>
                <p className="text-sm font-bold leading-tight" style={{ color: "var(--text)" }}>
                  {a.title}
                </p>
                <p className="text-xs leading-snug" style={{ color: "var(--text2)" }}>
                  {a.description}
                </p>
                {done ? (
                  <span className="text-xs font-bold mt-auto" style={{ color: "var(--accent-bright)" }}>
                    ✓ Открыто
                  </span>
                ) : (
                  <span className="text-xs font-semibold mt-auto" style={{ color: "var(--text3)" }}>
                    🔒 Закрыто
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
