"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { ACHIEVEMENTS, getAchievement } from "@/lib/achievements";

const AVATARS = ["🎨","🖌️","✏️","🎭","🦊","🐺","🐼","🦁","🐸","👾","🤖","👻","🎃","⚡","🔥","💎","🚀","🌙"];

export default function ProfilePage() {
  const router  = useRouter();
  const { user, profile, signOut, saveProfile, loading } = useAuth();

  const [earned,   setEarned]   = useState<string[]>([]);
  const [editing,  setEditing]  = useState(false);
  const [nickname, setNickname] = useState("");
  const [avatar,   setAvatar]   = useState("🎨");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [loading, user, router]);

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname);
      setAvatar(profile.avatar);
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", user.id)
      .then(({ data }) => setEarned(data?.map((r) => r.achievement_id) ?? []));
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim().length < 2) { setError("Минимум 2 символа"); return; }
    setSaving(true);
    const { error } = await saveProfile(nickname, avatar);
    if (error) setError(error.includes("unique") ? "Никнейм занят" : error);
    else setEditing(false);
    setSaving(false);
  };

  if (loading || !profile) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-2xl float">🎨</div>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center min-h-screen p-4 gap-4 pb-10">
      <header className="w-full max-w-lg flex items-center justify-between pt-3">
        <Link href="/" className="text-sm font-semibold hover:opacity-60" style={{ color: "var(--text2)" }}>
          ← Меню
        </Link>
        <h1 className="text-lg font-black text-gradient">Профиль</h1>
        <button onClick={signOut} className="text-sm font-semibold hover:opacity-60" style={{ color: "var(--text2)" }}>
          Выйти
        </button>
      </header>

      <div className="w-full max-w-lg flex flex-col gap-4">

        {/* Profile card */}
        <div className="glass p-6 flex flex-col items-center gap-4">
          {editing ? (
            <form onSubmit={handleSave} className="w-full flex flex-col gap-4">
              <div className="grid grid-cols-6 gap-2">
                {AVATARS.map((em) => (
                  <button key={em} type="button" onClick={() => setAvatar(em)}
                    className="text-xl rounded-xl p-2 transition-all"
                    style={{
                      background: avatar === em ? "var(--accent-dim)" : "rgba(255,255,255,0.04)",
                      border: avatar === em ? "1px solid var(--border-accent)" : "1px solid transparent",
                    }}
                  >{em}</button>
                ))}
              </div>
              <input
                value={nickname}
                onChange={(e) => { setNickname(e.target.value); setError(""); }}
                maxLength={20}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none text-center font-bold"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
              {error && <p className="text-xs text-center" style={{ color: "var(--red)" }}>{error}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(false)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text2)" }}
                >Отмена</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary py-2 rounded-xl text-sm font-bold disabled:opacity-40">
                  {saving ? "…" : "Сохранить"}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="text-5xl">{profile.avatar}</div>
              <div className="text-center">
                <h2 className="text-xl font-black" style={{ color: "var(--text)" }}>{profile.nickname}</h2>
                <p className="text-xs mt-1" style={{ color: "var(--text3)" }}>
                  Играет с {new Date(profile.created_at).toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
                </p>
              </div>
              <button onClick={() => setEditing(true)}
                className="text-xs px-4 py-1.5 rounded-lg font-semibold"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text2)" }}
              >✏️ Изменить</button>
            </>
          )}
        </div>

        {/* Stats */}
        <div className="glass p-5 grid grid-cols-2 gap-3">
          {[
            { label: "Лучший счёт",   value: profile.best_score,    gold: true },
            { label: "Всего очков",   value: profile.total_score,   gold: false },
            { label: "Игр сыграно",   value: profile.games_played,  gold: false },
            { label: "🔥 Стрик",      value: `${profile.current_streak} дн.`, gold: false },
          ].map(({ label, value, gold }) => (
            <div key={label} className="rounded-xl p-3 text-center"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
              <p className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: "var(--text3)" }}>{label}</p>
              <p className="text-xl font-black tabular-nums" style={{ color: gold ? "var(--yellow)" : "var(--text)" }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Achievements */}
        <div className="glass p-5 flex flex-col gap-3">
          <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--text3)" }}>
            Достижения {earned.length}/{ACHIEVEMENTS.length}
          </p>
          <div className="grid grid-cols-1 gap-2">
            {ACHIEVEMENTS.map((a) => {
              const done = earned.includes(a.id);
              return (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{
                    background: done ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.02)",
                    border: done ? "1px solid rgba(99,102,241,0.25)" : "1px solid var(--border)",
                    opacity: done ? 1 : 0.45,
                  }}
                >
                  <span className="text-2xl">{a.emoji}</span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{a.title}</p>
                    <p className="text-xs" style={{ color: "var(--text2)" }}>{a.description}</p>
                  </div>
                  {done && <span className="ml-auto text-xs font-bold" style={{ color: "var(--accent-bright)" }}>✓</span>}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </main>
  );
}
