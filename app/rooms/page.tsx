"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import {
  createRoom, getRoom, getRoomResults, ROOM_ROUNDS,
  type Room, type RoomResult,
} from "@/lib/rooms";

export default function RoomsPage() {
  return <Suspense><RoomsContent /></Suspense>;
}

function RoomsContent() {
  const code = useSearchParams().get("code");
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-black" style={{ color: "var(--text)" }}>Комнаты</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text2)" }}>
            Брось вызов другу — одни и те же слова, кто наберёт больше
          </p>
        </div>
        {code ? <RoomView code={code} /> : <Lobby />}
      </div>
    </AppShell>
  );
}

// ─── Lobby: create or join ──────────────────────────────────────────────────
function Lobby() {
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onCreate = async () => {
    if (!user) { setError("Войди, чтобы создать комнату"); return; }
    setBusy(true); setError(null);
    const room = await createRoom(user.id);
    setBusy(false);
    if (room) router.push(`/rooms?code=${room.code}`);
    else setError("Не удалось создать комнату");
  };

  return (
    <div className="grid sm:grid-cols-2 gap-5 items-start">
      <div className="glass p-6 flex flex-col gap-4 items-center text-center">
        <span className="text-4xl select-none">🎮</span>
        <p className="font-bold text-lg" style={{ color: "var(--text)" }}>Создать комнату</p>
        <p className="text-sm" style={{ color: "var(--text2)" }}>
          {ROOM_ROUNDS} случайных слов. Получишь код — кинь другу.
        </p>
        <button onClick={onCreate} disabled={busy}
          className="btn-primary w-full py-3 rounded-xl font-bold text-white disabled:opacity-50">
          {busy ? "Создаём…" : "Создать"}
        </button>
      </div>

      <div className="glass p-6 flex flex-col gap-4 items-center text-center">
        <span className="text-4xl select-none">🔑</span>
        <p className="font-bold text-lg" style={{ color: "var(--text)" }}>Войти по коду</p>
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="ABC12"
          className="w-full text-center text-xl font-black tracking-widest py-3 rounded-xl outline-none"
          style={{ background: "var(--input-bg)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
        <button
          onClick={() => joinCode.length >= 4 && router.push(`/rooms?code=${joinCode}`)}
          disabled={joinCode.length < 4}
          className="btn-primary w-full py-3 rounded-xl font-bold text-white disabled:opacity-50"
        >
          Войти
        </button>
      </div>

      {error && (
        <p className="sm:col-span-2 text-center text-sm" style={{ color: "var(--red)" }}>{error}</p>
      )}
    </div>
  );
}

// ─── Room view: scoreboard + play + share ───────────────────────────────────
function RoomView({ code }: { code: string }) {
  const { user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [results, setResults] = useState<RoomResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const r = await getRoom(code);
    setRoom(r);
    if (r) setResults(await getRoomResults(r.id));
    setLoading(false);
  }, [code]);

  useEffect(() => { load(); }, [load]);

  const share = async () => {
    const url = `${location.origin}/rooms?code=${code.toUpperCase()}`;
    const text = `Сыграй со мной в Draw & Guess! Комната ${code.toUpperCase()}`;
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share) { try { await nav.share({ text, url }); return; } catch { /* fall through */ } }
    try { await navigator.clipboard.writeText(`${text} ${url}`); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  if (loading) return <div className="glass p-12 text-center" style={{ color: "var(--text2)" }}>Загрузка…</div>;
  if (!room) return (
    <div className="glass p-12 text-center flex flex-col gap-4" style={{ color: "var(--text2)" }}>
      <p>Комната «{code.toUpperCase()}» не найдена</p>
      <Link href="/rooms" className="btn-primary py-2.5 px-6 rounded-xl font-bold text-white self-center">К комнатам</Link>
    </div>
  );

  const myResult = results.find((r) => user && r.user_id === user.id);
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="flex flex-col gap-5">
      {/* Code + share */}
      <div className="glass p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--text3)" }}>Код комнаты</p>
          <p className="text-3xl font-black tracking-widest" style={{ color: "var(--accent-bright)" }}>{room.code}</p>
        </div>
        <button onClick={share}
          className="py-2.5 px-5 rounded-xl font-semibold transition-all hover:opacity-80"
          style={{ background: "var(--input-bg)", border: "1px solid var(--border)", color: "var(--text2)" }}>
          {copied ? "Скопировано ✓" : "📤 Поделиться"}
        </button>
      </div>

      {/* Play / replay */}
      <Link href={`/game?room=${room.code}`}
        className="btn-primary w-full py-4 rounded-2xl font-bold text-lg text-white text-center">
        {myResult ? `Переиграть (${ROOM_ROUNDS} слов) →` : `Играть · ${ROOM_ROUNDS} слов →`}
      </Link>

      {/* Results */}
      <div className="glass p-4 flex flex-col gap-2">
        <p className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: "var(--text3)" }}>
          Результаты
        </p>
        {results.length === 0 ? (
          <p className="text-center py-6 text-sm" style={{ color: "var(--text2)" }}>
            Ещё никто не сыграл — стань первым
          </p>
        ) : (
          results.map((r, i) => {
            const isMe = user && r.user_id === user.id;
            return (
              <div key={r.user_id} className="flex items-center gap-3 px-3 py-3 rounded-xl"
                style={{
                  background: isMe ? "var(--accent-dim)" : i % 2 === 0 ? "var(--subtle-bg)" : "transparent",
                  border: isMe ? "1px solid var(--border-accent)" : "1px solid transparent",
                }}
              >
                <span className="w-7 text-center text-sm font-bold">{medals[i] ?? i + 1}</span>
                <span className="text-2xl leading-none select-none">{r.avatar}</span>
                <span className="flex-1 min-w-0 truncate text-sm font-semibold" style={{ color: "var(--text)" }}>
                  {r.nickname}{isMe && <span style={{ color: "var(--accent)" }}> (ты)</span>}
                </span>
                <span className="text-sm font-black tabular-nums" style={{ color: "var(--accent)" }}>{r.score}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
