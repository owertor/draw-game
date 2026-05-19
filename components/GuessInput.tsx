"use client";

import { useRef, useEffect, useState } from "react";

interface GuessInputProps {
  onGuess: (value: string) => void;
  disabled?: boolean;
  correct?: boolean; // show green flash on success
}

export default function GuessInput({ onGuess, disabled, correct }: GuessInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  // Auto-focus when enabled
  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    onGuess(v);
  };

  return (
    <div className="w-full flex flex-col gap-1">
      <label className="text-xs text-zinc-500">Угадай слово:</label>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder="Введи ответ…"
        className={`w-full px-4 py-3 rounded-xl text-white text-lg font-medium outline-none transition-colors
          disabled:opacity-40 disabled:cursor-not-allowed
          ${correct
            ? "bg-green-600 border-2 border-green-400"
            : "bg-zinc-800 border-2 border-zinc-700 focus:border-indigo-500"
          }`}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
    </div>
  );
}
