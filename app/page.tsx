import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-8 p-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-3 text-indigo-400">
          Draw & Guess
        </h1>
        <p className="text-lg text-zinc-400">
          Рисуй — бот угадывает. Бот рисует — угадываешь ты.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 flex flex-col gap-4 w-full max-w-sm">
        <Link
          href="/game"
          className="w-full py-4 px-6 rounded-xl text-center font-semibold text-lg text-white bg-indigo-500 hover:bg-indigo-600 transition-colors"
        >
          Начать игру
        </Link>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm">
          <p className="font-semibold mb-2 text-zinc-300">Как играть:</p>
          <ol className="list-decimal list-inside space-y-1 text-zinc-500">
            <li>Тебе дают слово — рисуй его за 20 сек</li>
            <li>Бот угадывает в реальном времени</li>
            <li>Потом бот рисует — ты угадываешь</li>
            <li>Очки за скорость!</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
