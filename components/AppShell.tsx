"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

/** Russian plural for days: 1 день / 2 дня / 5 дней */
function ruDays(n: number): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "день";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "дня";
  return "дней";
}

const NAV = [
  { href: "/dashboard",    icon: "🎮", label: "Играть"      },
  { href: "/daily",        icon: "📅", label: "Дейли"       },
  { href: "/rooms",        icon: "👥", label: "Комнаты"     },
  { href: "/leaderboard",  icon: "🏆", label: "Лидерборд"   },
  { href: "/achievements", icon: "🏅", label: "Достижения"  },
  { href: "/profile",      icon: "👤", label: "Профиль"     },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-3xl float">🎨</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">

      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside
        className="hidden md:flex w-60 flex-col fixed inset-y-0 left-0 z-30"
        style={{ background: "var(--bg2)", borderRight: "1px solid var(--border)" }}
      >
        {/* Logo */}
        <Link
          href="/dashboard"
          className="p-5 flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <span className="text-xl select-none">🎨</span>
          <span className="font-black text-gradient">Draw &amp; Guess</span>
        </Link>

        {/* Profile card */}
        {profile && (
          <Link
            href="/profile"
            className="p-4 flex items-center gap-3 shrink-0 hover:opacity-80 transition-opacity"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <span className="text-3xl leading-none select-none">{profile.avatar}</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm truncate" style={{ color: "var(--text)" }}>
                {profile.nickname}
              </p>
              <p className="text-xs font-semibold" style={{ color: "var(--yellow)" }}>
                🏆 {profile.best_score} очков
              </p>
            </div>
          </Link>
        )}

        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
          {NAV.map(({ href, icon, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                style={{
                  background: active ? "var(--accent-dim)"    : "transparent",
                  color:      active ? "var(--accent-bright)" : "var(--text2)",
                  border:     active ? "1px solid var(--border-accent)" : "1px solid transparent",
                }}
              >
                <span className="text-base w-5 text-center select-none">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Streak widget */}
        {profile && (
          <Link
            href="/daily"
            className="mx-3 mb-2 p-3 rounded-xl flex items-center gap-3 shrink-0 transition-all hover:opacity-80"
            style={{
              background: (profile.current_streak ?? 0) > 0 ? "rgba(251,146,60,0.10)" : "var(--item-bg)",
              border: (profile.current_streak ?? 0) > 0
                ? "1px solid rgba(251,146,60,0.3)"
                : "1px solid var(--border)",
            }}
          >
            <span className="text-2xl select-none leading-none">🔥</span>
            <div className="min-w-0">
              {(profile.current_streak ?? 0) > 0 ? (
                <>
                  <p className="text-sm font-black leading-tight" style={{ color: "var(--text)" }}>
                    {profile.current_streak} {ruDays(profile.current_streak)} подряд
                  </p>
                  <p className="text-xs" style={{ color: "var(--text3)" }}>Не теряй стрик!</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold leading-tight" style={{ color: "var(--text)" }}>
                    Начни стрик
                  </p>
                  <p className="text-xs" style={{ color: "var(--text3)" }}>Сыграй дейли сегодня</p>
                </>
              )}
            </div>
          </Link>
        )}

        {/* Bottom: sign-out + theme toggle */}
        <div
          className="p-3 flex items-center gap-2 shrink-0"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <button
            onClick={signOut}
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
            style={{
              background: "transparent",
              border: "1px solid transparent",
              color: "var(--text2)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(248,113,113,0.08)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--red)";
              (e.currentTarget as HTMLButtonElement).style.border = "1px solid rgba(248,113,113,0.2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text2)";
              (e.currentTarget as HTMLButtonElement).style.border = "1px solid transparent";
            }}
          >
            <span>↩</span>
            Выйти
          </button>
          <ThemeToggle variant="inline" />
        </div>
      </aside>

      {/* ── Mobile top bar ──────────────────────────────────── */}
      <header
        className="md:hidden fixed top-0 inset-x-0 z-30 h-14 flex items-center px-4 gap-3 shrink-0"
        style={{ background: "var(--bg2)", borderBottom: "1px solid var(--border)" }}
      >
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl select-none">🎨</span>
          <span className="font-black text-gradient text-sm">Draw &amp; Guess</span>
        </Link>
        <div className="flex-1" />
        <ThemeToggle variant="inline" />
        {profile && (
          <Link href="/profile">
            <span className="text-2xl select-none">{profile.avatar}</span>
          </Link>
        )}
      </header>

      {/* ── Main content ────────────────────────────────────── */}
      <div className="flex-1 md:ml-60 pt-14 md:pt-0 pb-20 md:pb-0">
        {children}
      </div>

      {/* ── Mobile bottom tab bar ───────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 h-16 flex items-stretch"
        style={{ background: "var(--bg2)", borderTop: "1px solid var(--border)" }}
      >
        {NAV.map(({ href, icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all"
              style={{ color: active ? "var(--accent-bright)" : "var(--text3)" }}
            >
              <span className="text-xl leading-none select-none">{icon}</span>
              <span className="text-xs font-semibold">{label}</span>
            </Link>
          );
        })}
      </nav>

    </div>
  );
}
