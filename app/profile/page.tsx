"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { ACHIEVEMENTS } from "@/lib/achievements";
import AppShell from "@/components/AppShell";

const AVATARS = ["🎨","🖌️","✏️","🎭","🦊","🐺","🐼","🦁","🐸","👾","🤖","👻","🎃","⚡","🔥","💎","🚀","🌙"];

export default function ProfilePage() {
  const { user, profile, saveProfile, signOut } = useAuth();

  const [earned,   setEarned]   = useState<string[]>([]);
  const [editing,  setEditing]  = useState(false);
  const [nickname, setNickname] = useState("");
  const [avatar,   setAvatar]   = useState("🎨");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  useEffect(() => {
    if (profile) { setNickname(profile.nickname); setAvatar(profile.avatar); }
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

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">

        <h1 className="text-3xl font-black" style={{ color: "var(--text)" }}>Профиль</h1>

        <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="flex flex-col gap-6">

        {/* ── Profile card ── */}
        <div className="glass p-6 flex flex-col items-center gap-4">
          {editing ? (
            <form onSubmit={handleSave} className="w-full flex flex-col gap-4">
              <div className="grid grid-cols-6 gap-2">
                {AVATARS.map((em) => (
                  <button key={em} type="button" onClick={() => setAvatar(em)}
                    className="text-xl rounded-xl p-2 transition-all"
                    style={{
                      background: avatar === em ? "var(--accent-dim)" : "var(--item-bg)",
                      border: avatar === em ? "1px solid var(--border-accent)" : "1px solid transparent",
                    }}
                  >
                    {em}
                  </button>
                ))}
              </div>
              <input
                value={nickname}
                onChange={(e) => { setNickname(e.target.value); setError(""); }}
                maxLength={20}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none text-center font-bold"
                style={{ background: "var(--input-bg)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
              {error && <p className="text-xs text-center" style={{ color: "var(--red)" }}>{error}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(false)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--border)", color: "var(--text2)" }}
                >
                  Отмена
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 btn-primary py-2 rounded-xl text-sm font-bold disabled:opacity-40"
                >
                  {saving ? "…" : "Сохранить"}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="text-5xl select-none">{profile?.avatar}</div>
              <div className="text-center">
                <h2 className="text-xl font-black" style={{ color: "var(--text)" }}>{profile?.nickname}</h2>
                <p className="text-xs mt-1" style={{ color: "var(--text3)" }}>
                  Играет с {new Date(profile?.created_at ?? "").toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
                </p>
              </div>
              <button onClick={() => setEditing(true)}
                className="text-xs px-4 py-1.5 rounded-lg font-semibold"
                style={{ background: "var(--input-bg)", border: "1px solid var(--border)", color: "var(--text2)" }}
              >
                ✏️ Изменить
              </button>
            </>
          )}
        </div>

        {/* ── Stats ── */}
        <div className="glass p-5 grid grid-cols-2 gap-3">
          {[
            { label: "Лучший счёт",  value: profile?.best_score,    color: "var(--accent)" },
            { label: "Всего очков",  value: profile?.total_score,   color: "var(--text)"   },
            { label: "Игр сыграно", value: profile?.games_played,  color: "var(--text)"   },
            { label: "Стрик",        value: `${profile?.current_streak ?? 0} дн.`, color: "var(--accent)" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-3 text-center"
              style={{ background: "var(--subtle-bg)", border: "1px solid var(--border)" }}
            >
              <p className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: "var(--text3)" }}>
                {label}
              </p>
              <p className="text-xl font-black tabular-nums" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
        </div>

        <div className="flex flex-col gap-6">
        {/* ── Achievements ── */}
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
                    background: done ? "var(--achievement-done-bg)" : "var(--item-bg)",
                    border: done ? "1px solid var(--achievement-done-border)" : "1px solid var(--border)",
                    opacity: done ? 1 : 0.5,
                  }}
                >
                  <span className="text-2xl select-none">{a.emoji}</span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{a.title}</p>
                    <p className="text-xs" style={{ color: "var(--text2)" }}>{a.description}</p>
                  </div>
                  {done && (
                    <span className="ml-auto text-xs font-bold" style={{ color: "var(--accent)" }}>✓</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Sign out ── */}
        <button
          onClick={signOut}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-colors"
          style={{
            background: "var(--item-bg)",
            border: "1px solid var(--border)",
            color: "var(--text2)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--red)"; e.currentTarget.style.borderColor = "rgba(177,69,58,0.35)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text2)"; e.currentTarget.style.borderColor = "var(--border)"; }}
        >
          Выйти из аккаунта
        </button>

        </div>
        </div>
      </div>
    </AppShell>
  );
}
