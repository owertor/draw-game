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
    ? "var(--red)"
    : pct > 55
    ? "var(--text)"
    : "var(--yellow)";

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
        style={{ height: "6px", background: "var(--item-bg)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${pct}%`, background: barBg }}
        />
      </div>
    </div>
  );
}
