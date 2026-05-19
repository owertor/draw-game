"use client";

import { useState, useEffect } from "react";
import { initModel, isModelReady } from "@/lib/quickdraw-model";

interface ModelLoaderProps {
  onReady: () => void;
}

export default function ModelLoader({ onReady }: ModelLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isModelReady()) {
      setDone(true);
      onReady();
      return;
    }

    initModel((p) => setProgress(p))
      .then(() => {
        setDone(true);
        onReady();
      })
      .catch((e) => {
        console.error(e);
        setError("Не удалось загрузить модель. Обновите страницу.");
      });
  }, [onReady]);

  if (done) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 gap-6 p-8">
      <h2 className="text-xl font-bold text-white">Загрузка модели…</h2>

      {error ? (
        <p className="text-red-400 text-sm text-center">{error}</p>
      ) : (
        <div className="w-full max-w-xs flex flex-col gap-2">
          <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-200"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="text-zinc-500 text-sm text-center">
            {Math.round(progress * 100)}% — обрабатываю обучающие рисунки
          </p>
        </div>
      )}
    </div>
  );
}
