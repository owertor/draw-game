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
      className="fixed inset-0 flex flex-col items-center justify-center gap-8 p-8"
      style={{ background: "var(--bg)", zIndex: "var(--z-overlay)" }}
    >
      <div className="text-6xl float select-none">🎨</div>

      <div className="text-center">
        <h2 className="text-3xl font-extrabold tracking-tight mb-2" style={{ color: "var(--text)" }}>Draw &amp; Guess</h2>
        <p style={{ color: "var(--text2)" }}>Подключаемся к ИИ…</p>
      </div>

      {error ? (
        <p
          className="text-sm text-center px-5 py-3 rounded-xl"
          style={{
            color:      "var(--red)",
            background: "rgba(177,69,58,0.08)",
            border:     "1px solid rgba(177,69,58,0.25)",
          }}
        >
          {error}
        </p>
      ) : (
        <div className="w-full max-w-[260px] flex flex-col gap-3">
          <div
            className="w-full rounded-full overflow-hidden"
            style={{ height: "4px", background: "var(--item-bg)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300 pulse-glow"
              style={{
                width:      `${Math.round(progress * 100)}%`,
                background: "var(--text)",
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
