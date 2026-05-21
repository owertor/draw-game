"use client";

import { useState, useEffect } from "react";
import { initModel, isModelReady } from "@/lib/quickdraw-model";

interface ModelLoaderProps {
  onReady: () => void;
}

export default function ModelLoader({ onReady }: ModelLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState<string | null>(null);

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
        setError("Не удалось подключиться. Обновите страницу.");
      });
  }, [onReady]);

  if (done) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 p-8"
      style={{
        background: "var(--bg)",
        backgroundImage:
          "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(99,102,241,0.12) 0%, transparent 70%)",
      }}
    >
      <div className="text-6xl float select-none">🎨</div>

      <div className="text-center">
        <h2 className="text-3xl font-black text-gradient mb-2">Draw &amp; Guess</h2>
        <p style={{ color: "var(--text2)" }}>Подключаемся к AI…</p>
      </div>

      {error ? (
        <p
          className="text-sm text-center px-5 py-3 rounded-xl"
          style={{
            color:      "var(--red)",
            background: "rgba(239,68,68,0.1)",
            border:     "1px solid rgba(239,68,68,0.25)",
          }}
        >
          {error}
        </p>
      ) : (
        <div className="w-full max-w-[260px] flex flex-col gap-3">
          <div
            className="w-full rounded-full overflow-hidden"
            style={{ height: "4px", background: "rgba(255,255,255,0.07)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300 pulse-glow"
              style={{
                width:      `${Math.round(progress * 100)}%`,
                background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
              }}
            />
          </div>
          <p className="text-xs text-center" style={{ color: "var(--text3)" }}>
            {Math.round(progress * 100)}%
          </p>
        </div>
      )}
    </div>
  );
}
