"use client";

import { useEffect, useState } from "react";
import type { Achievement } from "@/lib/achievements";

interface Props {
  achievement: Achievement | null;
  onDone: () => void;
}

export default function AchievementToast({ achievement, onDone }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!achievement) return;
    setVisible(true);
    const t = setTimeout(() => { setVisible(false); setTimeout(onDone, 400); }, 3500);
    return () => clearTimeout(t);
  }, [achievement, onDone]);

  if (!achievement) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl"
      style={{
        transform: `translateX(-50%) translateY(${visible ? "0" : "80px"})`,
        opacity: visible ? 1 : 0,
        transition: "transform 0.4s cubic-bezier(.34,1.56,.64,1), opacity 0.3s",
        background: "rgba(99,102,241,0.15)",
        border: "1px solid rgba(99,102,241,0.4)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 32px rgba(99,102,241,0.25)",
        minWidth: "240px",
      }}
    >
      <span className="text-2xl">{achievement.emoji}</span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--accent-bright)" }}>
          Достижение разблокировано!
        </p>
        <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{achievement.title}</p>
        <p className="text-xs" style={{ color: "var(--text2)" }}>{achievement.description}</p>
      </div>
    </div>
  );
}
