"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

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
      <div className="min-h-dvh flex items-center justify-center">
        <span className="text-3xl float select-none">🎨</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh">

      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside
        className="hidden md:flex w-60 flex-col fixed inset-y-0 left-0"
        style={{ background: "var(--bg2)", borderRight: "1px solid var(--border)", zIndex: "var(--z-nav)" }}
      >
        {/* Logo */}
        <Link
          href="/dashboard"
          className="px-5 h-16 flex items-center gap-2.5 shrink-0 hover:opacity-70 transition-opacity"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <span className="text-lg select-none">🎨</span>
          <span className="font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
            Draw&nbsp;&amp;&nbsp;Guess
          </span>
        </Link>

        {/* Profile card */}
        {profile && (
          <Link
            href="/profile"
            className="px-4 py-4 flex items-center gap-3 shrink-0 hover:opacity-70 transition-opacity"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <span
              className="w-10 h-10 flex items-center justify-center text-2xl leading-none select-none shrink-0"
              style={{ background: "var(--item-bg)", borderRadius: "12px" }}
            >
              {profile.avatar}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm truncate" style={{ color: "var(--text)" }}>
                {profile.nickname}
              </p>
              <p className="text-xs font-semibold tabular-nums" style={{ color: "var(--text3)" }}>
                рекорд {profile.best_score}
              </p>
            </div>
          </Link>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
          {NAV.map(({ href, icon, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                style={{
                  background: active ? "var(--item-bg)" : "transparent",
                  color:      active ? "var(--text)" : "var(--text2)",
                }}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full"
                    style={{ width: 3, height: 18, background: "var(--accent)" }}
                  />
                )}
                <span
                  className="text-base w-5 text-center select-none"
                  style={{ filter: active ? "none" : "grayscale(0.35)", opacity: active ? 1 : 0.85 }}
                >
                  {icon}
                </span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Streak widget */}
        {profile && (
          <Link
            href="/daily"
            className="mx-3 mb-2 p-3 rounded-xl flex items-center gap-3 shrink-0 transition-colors hover:bg-[var(--card-hover)]"
            style={{ background: "var(--item-bg)", border: "1px solid var(--border)" }}
          >
            <span className="text-xl select-none leading-none" style={{ filter: (profile.current_streak ?? 0) > 0 ? "none" : "grayscale(1)", opacity: (profile.current_streak ?? 0) > 0 ? 1 : 0.55 }}>🔥</span>
            <div className="min-w-0">
              {(profile.current_streak ?? 0) > 0 ? (
                <>
                  <p className="text-sm font-bold leading-tight" style={{ color: "var(--text)" }}>
                    {profile.current_streak} {ruDays(profile.current_streak)} подряд
                  </p>
                  <p className="text-xs" style={{ color: "var(--text3)" }}>не теряй серию</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold leading-tight" style={{ color: "var(--text)" }}>
                    Начни серию
                  </p>
                  <p className="text-xs" style={{ color: "var(--text3)" }}>сыграй дейли сегодня</p>
                </>
              )}
            </div>
          </Link>
        )}

        {/* Bottom: sign-out */}
        <div className="p-3 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors hover:text-[var(--red)]"
            style={{ background: "transparent", color: "var(--text3)" }}
          >
            <span aria-hidden>↩</span>
            Выйти
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ──────────────────────────────────── */}
      <header
        className="md:hidden fixed top-0 inset-x-0 h-14 flex items-center px-4 gap-3 shrink-0"
        style={{ background: "var(--navbar-bg)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--border)", zIndex: "var(--z-nav)" }}
      >
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-lg select-none">🎨</span>
          <span className="font-extrabold tracking-tight text-sm" style={{ color: "var(--text)" }}>
            Draw&nbsp;&amp;&nbsp;Guess
          </span>
        </Link>
        <div className="flex-1" />
        {profile && (
          <Link href="/profile" aria-label="Профиль">
            <span
              className="w-9 h-9 flex items-center justify-center text-xl select-none"
              style={{ background: "var(--item-bg)", borderRadius: "10px" }}
            >
              {profile.avatar}
            </span>
          </Link>
        )}
      </header>

      {/* ── Main content ────────────────────────────────────── */}
      <div className="flex-1 md:ml-60 pt-14 md:pt-0 pb-20 md:pb-0">
        {children}
      </div>

      {/* ── Mobile bottom tab bar ───────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 h-16 flex items-stretch"
        style={{ background: "var(--navbar-bg)", backdropFilter: "blur(16px)", borderTop: "1px solid var(--border)", zIndex: "var(--z-nav)" }}
      >
        {NAV.map(({ href, icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
              style={{ color: active ? "var(--text)" : "var(--text3)" }}
            >
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
                  style={{ width: 18, height: 3, background: "var(--accent)" }}
                />
              )}
              <span
                className="text-xl leading-none select-none"
                style={{ filter: active ? "none" : "grayscale(0.35)", opacity: active ? 1 : 0.8 }}
              >
                {icon}
              </span>
              <span className="text-[11px] font-semibold">{label}</span>
            </Link>
          );
        })}
      </nav>

    </div>
  );
}
