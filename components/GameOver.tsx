"use client";

import { shareResult } from "@/lib/share-card";
import { getBestScore } from "@/lib/storage";

interface PhaseResult {
  word: string;
  success: boolean;
  points: number;
}

interface GameOverProps {
  phase1: PhaseResult;
  phase2: PhaseResult;
  roundTotal: number;
  sessionTotal: number;
  onNext: () => void;
}

export default function GameOver({ phase1, phase2, roundTotal, sessionTotal, onNext }: GameOverProps) {
  const emoji  = roundTotal === 0 ? "😔" : roundTotal >= 200 ? "🔥" : roundTotal >= 100 ? "✅" : "👍";
  const stars  = roundTotal >= 250 ? "⭐⭐⭐" : roundTotal >= 120 ? "⭐⭐" : roundTotal > 0 ? "⭐" : "";

  return (
    <div className="w-full flex flex-col items-center gap-5">

      {/* Title */}
      <div className="text-center">
        <div className="text-4xl mb-1 scale-in">{emoji}</div>
        <h2 className="text-2xl font-black" style={{ color: "var(--text)" }}>Раунд завершён!</h2>
        {stars && <p className="text-xl mt-1">{stars}</p>}
      </div>

      {/* Phase results */}
      <div className="w-full flex flex-col gap-3">
        <PhaseCard
          icon="✏️"
          label="Ты рисовал"
          word={phase1.word}
          points={phase1.points}
          success={phase1.success}
          successText="Бот угадал!"
        />
        <PhaseCard
          icon="🤖"
          label="Бот рисовал"
          word={phase2.word}
          points={phase2.points}
          success={phase2.success}
          successText="Ты угадал!"
        />
      </div>

      {/* Total */}
      <div
        className="w-full rounded-2xl p-5 flex justify-between items-center"
        style={{ background: "var(--accent-dim)", border: "1px solid var(--border-accent)" }}
      >
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: "var(--text2)" }}>
            За раунд
          </p>
          <p className="text-4xl font-black" style={{ color: "var(--accent-bright)" }}>
            +{roundTotal}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: "var(--text2)" }}>
            Всего
          </p>
          <p className="text-4xl font-black" style={{ color: "var(--text)" }}>{sessionTotal}</p>
        </div>
      </div>

      <div className="w-full flex flex-col gap-2.5">
        <button
          onClick={onNext}
          className="btn-primary w-full py-4 rounded-2xl font-bold text-lg text-white"
        >
          Следующий раунд →
        </button>
        <button
          onClick={() =>
            shareResult(
              { title: "Мой результат", score: sessionTotal, scoreLabel: "очков за сессию",
                subtitle: `🏆 Рекорд: ${getBestScore()}` },
              `Я набрал ${sessionTotal} очков в Draw & Guess! Сможешь побить?`
            )
          }
          className="w-full py-3 rounded-2xl font-semibold transition-all hover:opacity-80"
          style={{ background: "var(--input-bg)", border: "1px solid var(--border)", color: "var(--text2)" }}
        >
          📤 Поделиться результатом
        </button>
      </div>
    </div>
  );
}

function PhaseCard({
  icon, label, word, points, success, successText,
}: {
  icon: string;
  label: string;
  word: string;
  points: number;
  success: boolean;
  successText: string;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={success ? {
        background: "rgba(34,197,94,0.08)",
        border: "1px solid rgba(34,197,94,0.28)",
      } : {
        background: "var(--item-bg)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex justify-between items-center">
        <div>
          <p
            className="text-[10px] uppercase tracking-widest font-semibold mb-1"
            style={{ color: "var(--text3)" }}
          >
            {icon} {label}
          </p>
          <p className="font-bold text-lg leading-tight" style={{ color: "var(--text)" }}>{word}</p>
        </div>
        <div className="text-right ml-3">
          <p
            className="text-2xl font-black tabular-nums"
            style={{ color: success ? "var(--green)" : "var(--text3)" }}
          >
            +{points}
          </p>
          <p className="text-xs" style={{ color: success ? "var(--green)" : "var(--text3)" }}>
            {success ? successText : "Не угадал"}
          </p>
        </div>
      </div>
    </div>
  );
}
