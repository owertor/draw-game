"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark,    setDark]    = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = (typeof localStorage !== "undefined" && localStorage.getItem("theme")) || "dark";
    setDark(stored === "dark");
  }, []);

  const toggle = () => {
    const next  = !dark;
    const theme = next ? "dark" : "light";
    setDark(next);
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Светлая тема" : "Тёмная тема"}
      title={dark ? "Светлая тема" : "Тёмная тема"}
      className="fixed bottom-5 right-5 w-10 h-10 rounded-full flex items-center justify-center text-base z-50 transition-all hover:scale-110 active:scale-95 select-none"
      style={{
        background:  "var(--card-hover)",
        border:      "1px solid var(--border)",
        boxShadow:   "0 2px 12px rgba(0,0,0,0.15)",
        color:       "var(--text)",
      }}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
