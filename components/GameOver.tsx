"use client";

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
  return (
    <div className="w-full flex flex-col items-center gap-5">
      <h2 className="text-2xl font-bold text-white">Раунд завершён!</h2>

      <div className="w-full flex flex-col gap-3">
        {/* Phase 1 result */}
        <div className={`rounded-xl p-4 border ${phase1.success ? "border-green-600 bg-green-950" : "border-zinc-700 bg-zinc-900"}`}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-zinc-400 mb-0.5">Ты рисовал — бот угадывал</p>
              <p className="text-white font-semibold">{phase1.word}</p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${phase1.success ? "text-green-400" : "text-zinc-600"}`}>
                +{phase1.points}
              </p>
              <p className="text-xs text-zinc-500">{phase1.success ? "Угадал!" : "Не угадал"}</p>
            </div>
          </div>
        </div>

        {/* Phase 2 result */}
        <div className={`rounded-xl p-4 border ${phase2.success ? "border-green-600 bg-green-950" : "border-zinc-700 bg-zinc-900"}`}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-zinc-400 mb-0.5">Бот рисовал — ты угадывал</p>
              <p className="text-white font-semibold">{phase2.word}</p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${phase2.success ? "text-green-400" : "text-zinc-600"}`}>
                +{phase2.points}
              </p>
              <p className="text-xs text-zinc-500">{phase2.success ? "Угадал!" : "Не угадал"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full rounded-xl p-4 bg-zinc-900 border border-zinc-700 flex justify-between items-center">
        <div>
          <p className="text-zinc-400 text-sm">Очков за раунд</p>
          <p className="text-3xl font-bold text-indigo-400">+{roundTotal}</p>
        </div>
        <div className="text-right">
          <p className="text-zinc-400 text-sm">Всего</p>
          <p className="text-3xl font-bold text-white">{sessionTotal}</p>
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full py-4 rounded-xl font-bold text-lg text-white bg-indigo-500 hover:bg-indigo-600 transition-colors"
      >
        Следующий раунд →
      </button>
    </div>
  );
}
