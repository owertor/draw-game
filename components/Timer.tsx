"use client";

interface TimerProps {
  seconds: number;
  maxSeconds: number;
  urgent?: boolean;
}

export default function Timer({ seconds, maxSeconds, urgent }: TimerProps) {
  const pct     = Math.max(0, Math.min(1, seconds / maxSeconds)) * 100;
  const isUrgent = urgent ?? seconds <= 5;

  const barBg = isUrgent
    ? "linear-gradient(90deg, #ef4444, #f87171)"
    : pct > 55
    ? "linear-gradient(90deg, #6366f1, #8b5cf6)"
    : "linear-gradient(90deg, #f59e0b, #fb923c)";

  const glow = isUrgent
    ? "0 0 10px rgba(239,68,68,0.5)"
    : pct > 55
    ? "0 0 10px rgba(99,102,241,0.45)"
    : "0 0 10px rgba(245,158,11,0.45)";

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex justify-between items-baseline">
        <span
          className="text-[10px] uppercase tracking-widest font-semibold"
          style={{ color: "var(--text3)" }}
        >
          Время
        </span>
        <span
          className={`font-black tabular-nums transition-colors ${isUrgent ? "animate-pulse" : ""}`}
          style={{ color: isUrgent ? "var(--red)" : "var(--text)", fontSize: "1.6rem", lineHeight: 1 }}
        >
          {seconds}
          <span className="text-sm font-normal ml-0.5" style={{ color: "var(--text3)" }}>с</span>
        </span>
      </div>

      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: "6px", background: "rgba(255,255,255,0.07)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${pct}%`, background: barBg, boxShadow: glow }}
        />
      </div>
    </div>
  );
}
