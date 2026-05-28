"use client";

import { useRef, useEffect, useState } from "react";

interface GuessInputProps {
  onGuess: (value: string) => void;
  disabled?: boolean;
  correct?: boolean;
}

export default function GuessInput({ onGuess, disabled, correct }: GuessInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue]     = useState("");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    onGuess(v);
  };

  const border = correct
    ? "2px solid var(--green)"
    : focused
    ? "2px solid var(--accent)"
    : "2px solid var(--border)";

  const shadow = "none";

  const bg = correct
    ? "rgba(63,125,78,0.10)"
    : "var(--input-bg)";

  return (
    <div className="w-full flex flex-col gap-2">
      <label
        className="text-[10px] uppercase tracking-widest font-semibold"
        style={{ color: "var(--text3)" }}
      >
        Угадай слово
      </label>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder="Введи ответ…"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ background: bg, border, boxShadow: shadow, color: "var(--text)", outline: "none" }}
        className="w-full px-4 py-3 rounded-xl text-lg font-semibold transition-all duration-200
                   disabled:opacity-40 disabled:cursor-not-allowed"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
    </div>
  );
}
