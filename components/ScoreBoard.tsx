"use client";

import { useEffect, useRef, useState } from "react";

/** Smoothly animates a number from its previous value to `target`. */
function useAnimatedNumber(target: number, duration = 650): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef  = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;

    cancelAnimationFrame(rafRef.current);
    const startTime = performance.now();

    const tick = (now: number) => {
      const t     = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(from + (target - from) * eased));

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

interface ScoreBoardProps {
  roundScore: number;
  totalScore: number;
  roundNumber: number;
  bestScore: number;
}

export default function ScoreBoard({ roundScore, totalScore, roundNumber, bestScore }: ScoreBoardProps) {
  const animRound = useAnimatedNumber(roundScore);
  const animTotal = useAnimatedNumber(totalScore);
  const animBest  = useAnimatedNumber(bestScore);

  return (
    <div
      className="w-full flex items-center justify-between px-5 py-3 rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.03)",
        border:     "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <Stat label="Раунд"     value={String(roundNumber)} />
      <div className="divider" />
      <Stat label="За раунд"  value={`+${animRound}`}      accent />
      <div className="divider" />
      <Stat label="Итого"     value={String(animTotal)}    large />
      <div className="divider" />
      <Stat label="🏆 Рекорд" value={String(animBest)}    gold />
    </div>
  );
}

function Stat({
  label, value, accent, gold, large,
}: {
  label: string;
  value: string;
  accent?: boolean;
  gold?:   boolean;
  large?:  boolean;
}) {
  const color = gold
    ? "var(--yellow)"
    : accent
    ? "var(--accent-bright)"
    : "var(--text)";

  return (
    <div className="flex flex-col items-center min-w-[48px]">
      <span
        className="text-[10px] uppercase tracking-widest font-semibold mb-0.5"
        style={{ color: "var(--text3)" }}
      >
        {label}
      </span>
      <span
        className={`font-black tabular-nums leading-tight ${large ? "text-xl" : "text-lg"}`}
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}
