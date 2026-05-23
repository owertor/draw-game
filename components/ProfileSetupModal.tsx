"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

const AVATARS = ["🎨","🖌️","✏️","🎭","🦊","🐺","🐼","🦁","🐸","👾","🤖","👻","🎃","⚡","🔥","💎","🚀","🌙"];

export default function ProfileSetupModal() {
  const { saveProfile } = useAuth();
  const [nickname, setNickname] = useState("");
  const [avatar,   setAvatar]   = useState("🎨");
  const [error,    setError]    = useState("");
  const [saving,   setSaving]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim().length < 2) { setError("Минимум 2 символа"); return; }
    if (nickname.trim().length > 20) { setError("Максимум 20 символов"); return; }
    setSaving(true);
    const { error } = await saveProfile(nickname, avatar);
    if (error) {
      setError(error.includes("unique") ? "Этот никнейм уже занят" : error);
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5"
        style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}
      >
        <div className="text-center">
          <div className="text-4xl mb-2">{avatar}</div>
          <h2 className="text-xl font-black text-gradient">Создай профиль</h2>
          <p className="text-sm mt-1" style={{ color: "var(--text2)" }}>
            Выбери аватар и никнейм
          </p>
        </div>

        {/* Avatar grid */}
        <div className="grid grid-cols-6 gap-2">
          {AVATARS.map((em) => (
            <button
              key={em}
              onClick={() => setAvatar(em)}
              className="text-xl rounded-xl p-2 transition-all"
              style={{
                background: avatar === em ? "var(--accent-dim)" : "rgba(255,255,255,0.04)",
                border: avatar === em ? "1px solid var(--border-accent)" : "1px solid transparent",
              }}
            >
              {em}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Никнейм"
            value={nickname}
            onChange={(e) => { setNickname(e.target.value); setError(""); }}
            maxLength={20}
            className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          />
          {error && <p className="text-xs" style={{ color: "var(--red)" }}>{error}</p>}
          <button
            type="submit"
            disabled={saving || !nickname.trim()}
            className="btn-primary py-3 rounded-xl font-bold disabled:opacity-40"
          >
            {saving ? "Сохранение…" : "Начать игру 🎮"}
          </button>
        </form>
      </div>
    </div>
  );
}
