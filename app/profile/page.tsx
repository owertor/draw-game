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

  const stats = [
    { label: "Лучший счёт", value: profile?.best_score ?? 0,              accent: true  },
    { label: "Всего очков", value: profile?.total_score ?? 0,             accent: false },
    { label: "Игр сыграно", value: profile?.games_played ?? 0,            accent: false },
    { label: "Стрик",       value: `${profile?.current_streak ?? 0} дн.`, accent: true  },
  ];

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-10 sm:py-14 flex flex-col gap-14">

        {/* ── Profile hero ── */}
        {editing ? (
          <form onSubmit={handleSave} className="flex flex-col gap-5">
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
              className="w-full px-4 py-3 rounded-xl text-base outline-none font-bold"
              style={{ background: "var(--input-bg)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            {error && <p className="text-xs" style={{ color: "var(--red)" }}>{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setEditing(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: "var(--item-bg)", border: "1px solid var(--border)", color: "var(--text2)" }}
              >
                Отмена
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 btn-primary py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40"
              >
                {saving ? "…" : "Сохранить"}
              </button>
            </div>
          </form>
        ) : (
          <header className="flex items-center gap-5">
            <div
              className="text-5xl sm:text-6xl select-none leading-none shrink-0 rounded-2xl flex items-center justify-center"
              style={{ width: "5.5rem", height: "5.5rem", background: "var(--item-bg)", border: "1px solid var(--border)" }}
            >
              {profile?.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-extrabold tracking-tight truncate" style={{ color: "var(--text)", fontSize: "clamp(1.7rem, 4vw, 2.4rem)" }}>
                {profile?.nickname}
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--text3)" }}>
                Играет с {new Date(profile?.created_at ?? "").toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
              </p>
              <button onClick={() => setEditing(true)}
                className="mt-3 text-xs px-4 py-1.5 rounded-lg font-semibold transition-colors hover:bg-[var(--item-bg)]"
                style={{ border: "1px solid var(--border)", color: "var(--text2)" }}
              >
                Изменить профиль
              </button>
            </div>
          </header>
        )}

        {/* ── Stats (editorial figure row) ── */}
        <section className="flex flex-col gap-5">
          <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--text3)" }}>
            Статистика
          </p>
          <div className="flex flex-wrap gap-y-8" style={{ borderTop: "1px solid var(--border)", paddingTop: "1.75rem" }}>
            {stats.map((s) => (
              <div key={s.label} className="flex-1 min-w-[7rem]">
                <p
                  className="font-extrabold tabular-nums leading-none"
                  style={{ color: s.accent ? "var(--accent)" : "var(--text)", fontSize: "clamp(1.8rem, 4vw, 2.5rem)" }}
                >
                  {s.value}
                </p>
                <p className="text-sm font-medium mt-2" style={{ color: "var(--text3)" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Achievements (clean list, hairline dividers) ── */}
        <section className="flex flex-col gap-5">
          <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--text3)" }}>
            Достижения · {earned.length}/{ACHIEVEMENTS.length}
          </p>
          <div className="flex flex-col">
            {ACHIEVEMENTS.map((a, i) => {
              const done = earned.includes(a.id);
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-4 py-4"
                  style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)", opacity: done ? 1 : 0.45 }}
                >
                  <span className="text-2xl select-none shrink-0" style={{ filter: done ? "none" : "grayscale(1)" }}>
                    {a.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{a.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text2)" }}>{a.description}</p>
                  </div>
                  {done && (
                    <span className="text-sm font-bold shrink-0" style={{ color: "var(--accent)" }}>✓</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Sign out ── */}
        <button
          onClick={signOut}
          className="self-start text-sm font-semibold transition-colors"
          style={{ color: "var(--text3)" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--red)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text3)"; }}
        >
          Выйти из аккаунта
        </button>

      </div>
    </AppShell>
  );
}
