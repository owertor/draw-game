import Link from "next/link";

const HOW_TO = [
  { icon: "✏️", title: "Рисуй слово",        sub: "30 секунд на рисунок" },
  { icon: "🤖", title: "Бот угадывает",       sub: "в реальном времени" },
  { icon: "👁️", title: "Бот рисует",          sub: "угадай как можно быстрее" },
  { icon: "⚡", title: "Очки за скорость",    sub: "чем раньше — тем больше" },
];

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-10 p-4 relative overflow-hidden">

      {/* Decorative glow blobs */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "5%", left: "50%", transform: "translateX(-50%)",
          width: 480, height: 320,
          background: "radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: "5%", right: "5%",
          width: 300, height: 200,
          background: "radial-gradient(ellipse, rgba(139,92,246,0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Hero */}
      <div className="text-center relative z-10 flex flex-col items-center gap-3">
        <div className="text-6xl float select-none">🎨</div>
        <h1 className="text-6xl font-black tracking-tight text-gradient">
          Draw &amp; Guess
        </h1>
        <p className="text-base font-medium" style={{ color: "var(--text2)" }}>
          Рисуй — бот угадывает. Бот рисует — угадываешь ты.
        </p>
      </div>

      {/* Card */}
      <div className="glass w-full max-w-sm p-6 flex flex-col gap-4 relative z-10">

        <Link
          href="/game"
          className="btn-primary w-full py-4 px-6 rounded-2xl text-center font-bold text-lg text-white"
        >
          Начать игру →
        </Link>

        {/* How-to grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {HOW_TO.map(({ icon, title, sub }) => (
            <div
              key={title}
              className="rounded-xl p-3"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="text-xl mb-1">{icon}</div>
              <p className="text-sm font-semibold text-white leading-tight">{title}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text3)" }}>{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
