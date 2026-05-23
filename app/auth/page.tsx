"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();
  const { signIn, signUp, signInGoogle } = useAuth();

  const [tab,       setTab]       = useState<"login" | "register">("login");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [nickname,  setNickname]  = useState("");
  const [nickState, setNickState] = useState<"idle" | "checking" | "free" | "taken">("idle");
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Real-time nickname availability check
  useEffect(() => {
    if (tab !== "register" || nickname.trim().length < 2) { setNickState("idle"); return; }
    setNickState("checking");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("id").eq("nickname", nickname.trim()).maybeSingle();
      setNickState(data ? "taken" : "free");
    }, 500);
  }, [nickname, tab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!email || !password) { setError("Заполни все поля"); return; }
    if (password.length < 6) { setError("Пароль минимум 6 символов"); return; }

    setLoading(true);
    if (tab === "login") {
      const { error } = await signIn(email, password);
      if (error) { setError("Неверный email или пароль"); setLoading(false); return; }
      router.push("/");
    } else {
      if (!nickname.trim()) { setError("Введи никнейм"); setLoading(false); return; }
      if (nickState === "taken") { setError("Никнейм занят"); setLoading(false); return; }
      if (nickState === "checking") { setError("Подожди, проверяем никнейм…"); setLoading(false); return; }
      const { error } = await signUp(email, password, nickname.trim());
      if (error) {
        setError(error.includes("already") ? "Этот email уже зарегистрирован" : error);
        setLoading(false); return;
      }
      setSuccess("Письмо с подтверждением отправлено на почту!");
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError("");
    const { error } = await signInGoogle();
    if (error) setError(error);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-6">

        <div className="text-center">
          <Link href="/" className="text-3xl">🎨</Link>
          <h1 className="text-2xl font-black text-gradient mt-2">Draw &amp; Guess</h1>
        </div>

        <div
          className="rounded-2xl p-6 flex flex-col gap-4"
          style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}
        >
          {/* Tabs */}
          <div
            className="flex rounded-xl p-1 gap-1"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(""); setSuccess(""); }}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: tab === t ? "var(--accent)" : "transparent",
                  color: tab === t ? "#fff" : "var(--text2)",
                }}
              >
                {t === "login" ? "Вход" : "Регистрация"}
              </button>
            ))}
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M45.5 24.5c0-1.5-.1-3-.4-4.5H24v8.5h12.1c-.5 2.8-2.1 5.1-4.4 6.7v5.5h7.1c4.2-3.9 6.7-9.6 6.7-16.2z"/>
              <path fill="#34A853" d="M24 46c6.1 0 11.2-2 14.9-5.5l-7.1-5.5c-2 1.3-4.5 2.1-7.8 2.1-6 0-11.1-4-12.9-9.5H3.7v5.7C7.4 41.1 15.1 46 24 46z"/>
              <path fill="#FBBC05" d="M11.1 27.6c-.5-1.3-.7-2.8-.7-4.3s.2-3 .7-4.3v-5.7H3.7C2.1 16.5 1 20.1 1 24s1.1 7.5 2.7 10.7l7.4-7.1z"/>
              <path fill="#EA4335" d="M24 10.7c3.4 0 6.4 1.2 8.8 3.4l6.6-6.6C35.2 3.8 30 1.5 24 1.5 15.1 1.5 7.4 6.4 3.7 13.3l7.4 5.7c1.8-5.5 6.9-8.3 12.9-8.3z"/>
            </svg>
            Войти через Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-xs" style={{ color: "var(--text3)" }}>или</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {tab === "register" && (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Никнейм"
                  value={nickname}
                  onChange={(e) => { setNickname(e.target.value); setError(""); }}
                  maxLength={20}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none pr-10"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${nickState === "free" ? "var(--green)" : nickState === "taken" ? "var(--red)" : "var(--border)"}`,
                    color: "var(--text)",
                  }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">
                  {nickState === "checking" && <span style={{ color: "var(--text3)" }}>…</span>}
                  {nickState === "free"     && <span style={{ color: "var(--green)" }}>✓</span>}
                  {nickState === "taken"    && <span style={{ color: "var(--red)" }}>✗</span>}
                </span>
                {nickState === "taken" && (
                  <p className="text-xs mt-1" style={{ color: "var(--red)" }}>Никнейм занят</p>
                )}
              </div>
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            {error   && <p className="text-xs" style={{ color: "var(--red)" }}>{error}</p>}
            {success && <p className="text-xs" style={{ color: "var(--green)" }}>{success}</p>}
            <button
              type="submit"
              disabled={loading || (tab === "register" && nickState === "taken")}
              className="btn-primary py-3 rounded-xl font-bold disabled:opacity-40"
            >
              {loading ? "…" : tab === "login" ? "Войти" : "Зарегистрироваться"}
            </button>
          </form>
        </div>

        <Link href="/" className="text-center text-sm hover:opacity-80" style={{ color: "var(--text2)" }}>
          ← Назад в меню
        </Link>
      </div>
    </main>
  );
}
