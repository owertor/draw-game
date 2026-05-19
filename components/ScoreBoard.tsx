"use client";

interface ScoreBoardProps {
  roundScore: number;
  totalScore: number;
  roundNumber: number;
  bestScore: number;
}

export default function ScoreBoard({ roundScore, totalScore, roundNumber, bestScore }: ScoreBoardProps) {
  return (
    <div className="w-full flex items-center justify-between text-sm">
      <div className="flex flex-col items-center">
        <span className="text-zinc-500 text-xs">Раунд</span>
        <span className="text-white font-bold">{roundNumber}</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-zinc-500 text-xs">За раунд</span>
        <span className="text-indigo-400 font-bold text-lg">{roundScore}</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-zinc-500 text-xs">Итого</span>
        <span className="text-white font-bold text-lg">{totalScore}</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-zinc-500 text-xs">Рекорд</span>
        <span className="text-yellow-400 font-bold">{bestScore}</span>
      </div>
    </div>
  );
}
