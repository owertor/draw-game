"use client";

interface TimerProps {
  seconds: number;
  maxSeconds: number;
  urgent?: boolean; // red + pulsing below 5s
}

export default function Timer({ seconds, maxSeconds, urgent }: TimerProps) {
  const pct = Math.max(0, Math.min(1, seconds / maxSeconds)) * 100;
  const isUrgent = urgent ?? seconds <= 5;

  return (
    <div className="w-full flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-zinc-500">Время</span>
        <span
          className={`text-lg font-bold tabular-nums transition-colors ${
            isUrgent ? "text-red-400 animate-pulse" : "text-white"
          }`}
        >
          {seconds}с
        </span>
      </div>
      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-linear"
          style={{
            width: `${pct}%`,
            background: isUrgent
              ? "#f87171"
              : pct > 50
              ? "#6366f1"
              : "#f59e0b",
          }}
        />
      </div>
    </div>
  );
}
