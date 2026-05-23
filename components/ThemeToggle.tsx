"use client";

import { useEffect, useState } from "react";

interface Props {
  /** "floating" = fixed bottom-right button (default), "inline" = regular button */
  variant?: "floating" | "inline";
}

export default function ThemeToggle({ variant = "floating" }: Props) {
  const [dark,    setDark]    = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark((localStorage.getItem("theme") ?? "dark") === "dark");
  }, []);

  const toggle = () => {
    const next  = !dark;
    const theme = next ? "dark" : "light";
    setDark(next);
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  };

  if (!mounted) return null;

  const label = dark ? "☀️" : "🌙";
  const title = dark ? "Светлая тема" : "Тёмная тема";

  if (variant === "inline") {
    return (
      <button
        onClick={toggle}
        aria-label={title}
        title={title}
        className="w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all hover:scale-110 active:scale-95 select-none shrink-0"
        style={{ background: "var(--item-bg)", border: "1px solid var(--border)" }}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      aria-label={title}
      title={title}
      className="fixed bottom-5 right-5 w-10 h-10 rounded-full flex items-center justify-center text-base z-50 transition-all hover:scale-110 active:scale-95 select-none"
      style={{
        background: "var(--card-hover)",
        border:     "1px solid var(--border)",
        boxShadow:  "0 2px 12px rgba(0,0,0,0.15)",
      }}
    >
      {label}
    </button>
  );
}
