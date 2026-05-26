"use client";

import { Suspense } from "react";
import { useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import DrawingCanvas from "@/components/DrawingCanvas";
import BotCanvas from "@/components/BotCanvas";
import ModelLoader from "@/components/ModelLoader";
import Timer from "@/components/Timer";
import GuessInput from "@/components/GuessInput";
import ScoreBoard from "@/components/ScoreBoard";
import GameOver from "@/components/GameOver";
import AchievementToast from "@/components/AchievementToast";
import { predict, type Prediction } from "@/lib/quickdraw-model";
import { checkAnswer } from "@/lib/fuzzy-match";
import { WORD_LIST, getRandomWord, getWordByEn, type WordEntry } from "@/lib/word-list";
import { getRandomDrawing, type QuickDrawDrawing } from "@/lib/drawings-loader";
import { getBestScore, saveGameResult } from "@/lib/storage";
import { Sounds } from "@/lib/sounds";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { getAchievement, type Achievement } from "@/lib/achievements";
import { getDailyWord, getTodayDate } from "@/lib/daily";
import { shareResult } from "@/lib/share-card";

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Russian plural form: 1 буква / 2 буквы / 5 букв */
function ruLetters(n: number): string {
  const mod10  = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11)                          return `${n} буква`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} буквы`;
  return `${n} букв`;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PHASE1_TIME = 30; // seconds: player draws, bot guesses
const PHASE2_TIME = 30; // seconds: bot draws, player guesses (timer starts immediately)
const POINTS_PER_SECOND = 5; // points per remaining second (both phases, max 150)
const BOT_DRAW_DURATION_MS = 8000; // how long the bot takes to draw (~8s)

type Phase = "idle" | "player_drawing" | "bot_drawing" | "round_over";

interface RoundResult {
  word: string;
  success: boolean;
  points: number;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function GamePage() {
  return <Suspense><GameContent /></Suspense>;
}

function GameContent() {
  const searchParams  = useSearchParams();
  const isDaily       = searchParams.get("daily") === "true";
  const { user, profile, refreshProfile } = useAuth();

  const [modelReady, setModelReady] = useState(false);
  const modelReadyRef = useRef(false);

  // Achievements
  const [toastAchievement, setToastAchievement] = useState<Achievement | null>(null);
  const earnedRef = useRef<Set<string>>(new Set());

  // Load already-earned achievements so we don't re-award them
  useEffect(() => {
    if (!user) return;
    supabase.from("user_achievements").select("achievement_id").eq("user_id", user.id)
      .then(({ data }) => { data?.forEach((r) => earnedRef.current.add(r.achievement_id)); });
  }, [user]);

  const awardAchievement = useCallback(async (id: string) => {
    if (!user || earnedRef.current.has(id)) return;
    earnedRef.current.add(id);
    await supabase.from("user_achievements").insert({ user_id: user.id, achievement_id: id }).select().maybeSingle();
    const a = getAchievement(id);
    if (a) setToastAchievement(a);
  }, [user]);

  // Game state
  const [phase, setPhase] = useState<Phase>("idle");
  const [roundNumber, setRoundNumber] = useState(1);
  const [sessionScore, setSessionScore] = useState(0);
  const sessionScoreRef = useRef(0);
  const [bestScore, setBestScore] = useState(0);
  const [roundScore, setRoundScore] = useState(0);

  // Phase 1
  const [p1Word, setP1Word] = useState<WordEntry | null>(null);
  const [p1TimeLeft, setP1TimeLeft] = useState(PHASE1_TIME);
  const [p1Predictions, setP1Predictions] = useState<Prediction[]>([]);
  const [p1Success, setP1Success] = useState(false);
  const [p1Result, setP1Result] = useState<RoundResult | null>(null);

  // Phase 2
  const [p2Word, setP2Word] = useState<WordEntry | null>(null);
  const [p2Drawing, setP2Drawing] = useState<QuickDrawDrawing | null>(null);
  const [p2BotDone, setP2BotDone] = useState(false);
  const [p2TimeLeft, setP2TimeLeft] = useState(PHASE2_TIME);
  const [p2GuessCorrect, setP2GuessCorrect] = useState(false);
  const [p2Result, setP2Result] = useState<RoundResult | null>(null);
  const [p2BotKey, setP2BotKey] = useState(0);
  const [p2EarnedPoints, setP2EarnedPoints] = useState(0);

  // Refs for timers
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const predictThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const predictInFlightRef = useRef(false);
  const p1SuccessRef = useRef(false);
  const p2GuessCorrectRef = useRef(false);
  const p2BotDoneRef = useRef(false);
  const p2TimeLeftRef = useRef(PHASE2_TIME);
  const phaseRef = useRef<Phase>("idle");
  const p1WordRef = useRef<WordEntry | null>(null);
  const p2WordRef = useRef<WordEntry | null>(null);
  const p1ResultRef = useRef<RoundResult | null>(null);

  // ── Model ──────────────────────────────────────────────────────────────────
  const handleModelReady = useCallback(() => {
    setModelReady(true);
    modelReadyRef.current = true;
    setBestScore(getBestScore());
  }, []);

  // ── Timer helper ──────────────────────────────────────────────────────────
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** Side-effecting Supabase persistence — kept out of the state updater. */
  const persistRound = useCallback(
    async ({ p1, p2, total, newTotal }: {
      p1: RoundResult; p2: RoundResult; total: number; newTotal: number;
    }) => {
      if (!user) return;

      const gameRes = await supabase
        .from("game_results")
        .insert({ user_id: user.id, score: newTotal, rounds_played: roundNumber });
      if (gameRes.error) console.error("[game] save result failed:", gameRes.error.message);

      // Daily challenge: keep the best score for today (one row per user/day).
      if (isDaily) {
        const today = getTodayDate();
        const { data: prev } = await supabase
          .from("daily_results")
          .select("score").eq("user_id", user.id).eq("date", today).maybeSingle();
        const bestDaily = Math.max(total, prev?.score ?? 0);
        const dailyRes = await supabase
          .from("daily_results")
          .upsert({ user_id: user.id, date: today, score: bestDaily }, { onConflict: "user_id,date" });
        if (dailyRes.error) console.error("[game] daily save failed:", dailyRes.error.message);
        else awardAchievement("daily_played");
      }

      // Daily streak: today = unchanged, yesterday = +1, older/none = reset to 1.
      const today = getTodayDate();
      const lastPlayed = profile?.last_played_date ?? null;
      const yest = new Date(today + "T00:00:00Z");
      yest.setUTCDate(yest.getUTCDate() - 1);
      const yesterday = yest.toISOString().split("T")[0];
      let streak = profile?.current_streak ?? 0;
      if (lastPlayed !== today) {
        streak = lastPlayed === yesterday ? streak + 1 : 1;
      }
      const bestStreak = Math.max(streak, profile?.best_streak ?? 0);

      // Update profile stats
      const newBest = Math.max(newTotal, profile?.best_score ?? 0);
      const gamesPlayed = (profile?.games_played ?? 0) + 1;
      const profRes = await supabase.from("profiles").update({
        total_score: (profile?.total_score ?? 0) + total,
        games_played: gamesPlayed,
        best_score: newBest,
        current_streak: streak,
        best_streak: bestStreak,
        last_played_date: today,
      }).eq("id", user.id);
      if (profRes.error) console.error("[game] profile update failed:", profRes.error.message);
      else await refreshProfile();

      // Achievements
      if (newTotal >= 500) awardAchievement("score_500");
      if (newTotal >= 1000) awardAchievement("score_1000");
      if (gamesPlayed >= 10) awardAchievement("artist_10");
      if (gamesPlayed >= 50) awardAchievement("artist_50");
      if (p1.points >= 150 || p2.points >= 150) awardAchievement("perfect_phase");
      if (streak >= 3) awardAchievement("streak_3");
      if (streak >= 7) awardAchievement("streak_7");
    },
    [user, profile, roundNumber, isDaily, awardAchievement, refreshProfile]
  );

  // ── End round ─────────────────────────────────────────────────────────────
  const endRound = useCallback(
    (p1: RoundResult, p2: RoundResult) => {
      clearTimer();
      const total = p1.points + p2.points;
      if (total === 0) Sounds.fail();
      setP1Result(p1);
      setP2Result(p2);
      setRoundScore(total);

      // Compute the new session total via a ref so persistence runs exactly once
      // (a state-updater body would re-run under React StrictMode → double writes).
      const newTotal = sessionScoreRef.current + total;
      sessionScoreRef.current = newTotal;
      setSessionScore(newTotal);
      saveGameResult(newTotal);

      // Persist to Supabase when logged in
      if (user) void persistRound({ p1, p2, total, newTotal });

      setBestScore(getBestScore());
      setPhase("round_over");
      phaseRef.current = "round_over";
    },
    [clearTimer, user, persistRound]
  );

  // ── Phase 2 end ───────────────────────────────────────────────────────────
  const endPhase2 = useCallback(
    (success: boolean, points: number) => {
      if (phaseRef.current !== "bot_drawing") return;
      clearTimer();
      const p1 = p1ResultRef.current ?? { word: p1WordRef.current?.ru ?? "", success: false, points: 0 };
      endRound(p1, {
        word: p2WordRef.current?.ru ?? "",
        success,
        points,
      });
    },
    [clearTimer, endRound]
  );

  // ── Daily challenge: single round, phase 1 only (no phase 2, no replay) ─────
  const endDailyRound = useCallback(
    (p1: RoundResult) => {
      clearTimer();
      const total = p1.points;
      if (total === 0) Sounds.fail();
      setP1Result(p1);
      setP2Result(null);
      setRoundScore(total);
      const newTotal = sessionScoreRef.current + total;
      sessionScoreRef.current = newTotal;
      setSessionScore(newTotal);
      saveGameResult(newTotal);
      if (user) void persistRound({ p1, p2: { word: "", success: false, points: 0 }, total, newTotal });
      setBestScore(getBestScore());
      setPhase("round_over");
      phaseRef.current = "round_over";
    },
    [clearTimer, user, persistRound]
  );

  // ── Phase 1: realtime prediction ──────────────────────────────────────────
  const runPredict = useCallback(async () => {
    if (!modelReadyRef.current || p1SuccessRef.current) return;
    if (predictInFlightRef.current) return; // skip if previous request still running
    const canvas = document.getElementById("game-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    predictInFlightRef.current = true;
    const results = await predict(canvas);
    predictInFlightRef.current = false;
    setP1Predictions(results);

    // Check if bot guessed correctly — target word anywhere in top-5
    if (p1Word && results.some((r) => r.label === p1Word.en)) {
      p1SuccessRef.current = true;
      setP1Success(true);
      Sounds.correct();
      clearTimer();
      const timeBonus = p1TimeLeft;
      const points = timeBonus * POINTS_PER_SECOND;
      const result: RoundResult = { word: p1Word.ru, success: true, points };
      p1ResultRef.current = result;
      setP1Result(result);
      // Achievements
      awardAchievement("first_guess");
      if (timeBonus > 20) awardAchievement("lightning");
      // Daily = single round (ends here); classic continues to phase 2
      setTimeout(() => (isDaily ? endDailyRound(result) : startPhase2()), 1500);
    }
  }, [p1Word, p1TimeLeft, clearTimer, isDaily, endDailyRound]);

  const handleStrokeEnd = useCallback(() => {
    if (predictThrottleRef.current) return;
    // Local inference is ~tens of ms, so we can recognise almost in real time.
    // (Was 1500ms only to rate-limit the old Groq API.)
    predictThrottleRef.current = setTimeout(() => {
      predictThrottleRef.current = null;
      runPredict();
    }, 500);
  }, [runPredict]);

  // ── Start Phase 1 ─────────────────────────────────────────────────────────
  const startPhase1 = useCallback(() => {
    Sounds.start();
    const word = isDaily ? getDailyWord() : getRandomWord();
    p1SuccessRef.current = false;
    p1WordRef.current = word;
    setP1Word(word);
    setP1TimeLeft(PHASE1_TIME);
    setP1Predictions([]);
    setP1Success(false);
    setP1Result(null);
    setPhase("player_drawing");
    phaseRef.current = "player_drawing";

    let t = PHASE1_TIME;
    timerRef.current = setInterval(() => {
      t--;
      setP1TimeLeft(t);
      if (t <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        if (!p1SuccessRef.current) {
          const result: RoundResult = { word: word.ru, success: false, points: 0 };
          p1ResultRef.current = result;
          setP1Result(result);
          setTimeout(() => (isDaily ? endDailyRound(result) : startPhase2()), 1200);
        }
      }
    }, 1000);
  }, [isDaily]);

  // ── Start Phase 2 ─────────────────────────────────────────────────────────
  const startPhase2 = useCallback(async () => {
    // Daily challenge: use today's word; otherwise pick a random different word
    const word = isDaily
      ? getDailyWord()
      : (() => {
          const available = WORD_LIST.filter((w) => w.en !== p1Word?.en);
          return available[Math.floor(Math.random() * available.length)];
        })();
    const drawingEntry = await getRandomDrawing(word.en);

    p2GuessCorrectRef.current = false;
    p2BotDoneRef.current = false;
    p2TimeLeftRef.current = PHASE2_TIME;

    p2WordRef.current = word;
    setP2Word(word);
    setP2Drawing(drawingEntry?.strokes ?? null);
    setP2BotDone(false);
    setP2TimeLeft(PHASE2_TIME);
    setP2GuessCorrect(false);
    setP2Result(null);
    setP2EarnedPoints(0);
    setP2BotKey((k) => k + 1);
    setPhase("bot_drawing");
    phaseRef.current = "bot_drawing";

    // Timer starts immediately — player can guess while bot draws for more points
    let t = PHASE2_TIME;
    timerRef.current = setInterval(() => {
      t--;
      p2TimeLeftRef.current = t;
      setP2TimeLeft(t);
      if (t <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        if (!p2GuessCorrectRef.current) {
          endPhase2(false, 0);
        }
      }
    }, 1000);
  }, [p1Word, endPhase2, isDaily]);

  // ── Phase 2: bot drawing complete ─────────────────────────────────────────
  const handleBotDrawingComplete = useCallback(() => {
    if (p2GuessCorrectRef.current) return; // already guessed
    p2BotDoneRef.current = true;
    setP2BotDone(true);
    // Timer is already running — no new timer needed
  }, []);

  // ── Phase 2: player guess ──────────────────────────────────────────────────
  const handleGuess = useCallback(
    (value: string) => {
      if (p2GuessCorrectRef.current || !p2Word) return;
      if (checkAnswer(value, p2Word.en)) {
        p2GuessCorrectRef.current = true;
        setP2GuessCorrect(true);
        Sounds.correct();
        clearTimer();
        // Points based on time remaining — guess early for more points
        const points = p2TimeLeftRef.current * POINTS_PER_SECOND;
        setP2EarnedPoints(points);
        // Achievement: guessed before bot finished drawing
        if (!p2BotDoneRef.current) awardAchievement("guesser");
        setTimeout(() => endPhase2(true, points), 800);
      }
    },
    [p2Word, clearTimer, endPhase2]
  );

  // ── Next round ────────────────────────────────────────────────────────────
  const handleNextRound = useCallback(() => {
    setRoundNumber((n) => n + 1);
    setRoundScore(0);
    startPhase1();
  }, [startPhase1]);

  // ── Tick sound for last 5 seconds of phase 1 ──────────────────────────────
  useEffect(() => {
    if (phase === "player_drawing" && p1TimeLeft > 0 && p1TimeLeft <= 5 && !p1Success) {
      Sounds.tick();
    }
  }, [p1TimeLeft, phase, p1Success]);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  useEffect(() => () => clearTimer(), [clearTimer]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <ModelLoader onReady={handleModelReady} />
      <AchievementToast achievement={toastAchievement} onDone={() => setToastAchievement(null)} />

      <main className="flex flex-col items-center min-h-screen p-4 gap-4 pb-10">

        {/* Header */}
        <header className="w-full max-w-lg flex items-center justify-between pt-3">
          <Link
            href="/dashboard"
            className="text-sm font-semibold transition-opacity hover:opacity-60"
            style={{ color: "var(--text2)" }}
          >
            ← Меню
          </Link>
          <h1 className="text-lg font-black text-gradient">Draw &amp; Guess</h1>
          <div className="w-16" />
        </header>

        <div className="w-full max-w-lg flex flex-col gap-4">

          {/* ScoreBoard */}
          {phase !== "idle" && (
            <ScoreBoard
              roundScore={roundScore}
              totalScore={sessionScore}
              roundNumber={roundNumber}
              bestScore={bestScore}
            />
          )}

          {/* ── IDLE ───────────────────────────────────────────────────────── */}
          {phase === "idle" && (
            <div className="phase-enter glass p-8 flex flex-col items-center gap-6">
              <div className="text-5xl float select-none">🎨</div>
              <div className="text-center">
                {bestScore > 0 && (
                  <p className="text-sm font-semibold mb-2" style={{ color: "var(--yellow)" }}>
                    🏆 Рекорд: {bestScore}
                  </p>
                )}
                <p className="font-medium" style={{ color: "var(--text2)" }}>
                  Готов сыграть?
                </p>
              </div>
              <button
                onClick={startPhase1}
                disabled={!modelReady}
                className="btn-primary w-full py-4 px-6 rounded-2xl font-bold text-lg text-white"
              >
                {modelReady ? "Начать игру!" : "Загрузка…"}
              </button>
            </div>
          )}

          {/* ── PHASE 1: Player draws ──────────────────────────────────────── */}
          {phase === "player_drawing" && p1Word && (
            <div className="phase-enter glass p-5 flex flex-col gap-4">

              {/* Phase header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-semibold mb-1"
                     style={{ color: "var(--text3)" }}>
                    Нарисуй это
                  </p>
                  <p
                    className="text-4xl font-black leading-tight"
                    style={{ color: p1Success ? "var(--green)" : "var(--text)" }}
                  >
                    {p1Word.ru}
                  </p>
                </div>
                <div
                  className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider"
                  style={{
                    background: "var(--accent-dim)",
                    border:     "1px solid var(--border-accent)",
                    color:      "var(--accent-bright)",
                  }}
                >
                  Фаза 1
                </div>
              </div>

              <Timer seconds={p1TimeLeft} maxSeconds={PHASE1_TIME} />

              <DrawingCanvas
                canvasId="game-canvas"
                onClear={() => setP1Predictions([])}
                onStrokeEnd={handleStrokeEnd}
                disabled={p1Success}
              />

              {/* Bot predictions */}
              {p1Predictions.length > 0 && !p1Success && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] uppercase tracking-widest font-semibold"
                     style={{ color: "var(--text3)" }}>
                    🤖 Бот думает:
                  </p>
                  {p1Predictions.map(({ label, confidence }, i) => {
                    const wordEntry = getWordByEn(label);
                    const displayName = wordEntry?.ru ?? label.replace(/_/g, " ");
                    const isTarget = label === p1Word?.en;
                    const pct = Math.round(confidence * 100);
                    return (
                      <div key={label} className="flex items-center gap-2">
                        <span className="text-xs w-4 font-bold" style={{ color: "var(--text3)" }}>
                          {i + 1}.
                        </span>
                        <div
                          className="flex-1 h-7 rounded-xl overflow-hidden relative"
                          style={{ background: "var(--input-bg)" }}
                        >
                          <div
                            className="h-full rounded-xl transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              background: isTarget
                                ? "linear-gradient(90deg,#22c55e,#4ade80)"
                                : i === 0
                                ? "linear-gradient(90deg,#6366f1,#8b5cf6)"
                                : "var(--border)",
                              boxShadow: isTarget
                                ? "0 0 12px rgba(34,197,94,0.4)"
                                : i === 0
                                ? "0 0 12px rgba(99,102,241,0.3)"
                                : "none",
                            }}
                          />
                          <span className="absolute inset-0 flex items-center px-3 text-xs font-semibold"
                                style={{ color: "var(--text)" }}>
                            {displayName}{isTarget && " ✓"}
                          </span>
                        </div>
                        <span className="text-xs tabular-nums w-8 text-right font-medium"
                              style={{ color: "var(--text3)" }}>
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {p1Success && (
                <div
                  className="rounded-2xl p-4 text-center"
                  style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)" }}
                >
                  <p className="font-bold text-lg" style={{ color: "var(--green)" }}>
                    🎉 Бот угадал! +{p1TimeLeft * POINTS_PER_SECOND} очков
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── PHASE 2: Bot draws ─────────────────────────────────────────── */}
          {phase === "bot_drawing" && p2Word && (
            <div className="phase-enter glass p-5 flex flex-col gap-4">

              {/* Phase header */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: "var(--text2)" }}>
                  {p2BotDone
                    ? "🤖 Бот нарисовал — угадай что!"
                    : "🤖 Бот рисует — угадывай по ходу!"}
                </p>
                <div
                  className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider"
                  style={{
                    background: "rgba(139,92,246,0.12)",
                    border:     "1px solid rgba(139,92,246,0.35)",
                    color:      "#c084fc",
                  }}
                >
                  Фаза 2
                </div>
              </div>

              {!p2GuessCorrect && (
                <Timer seconds={p2TimeLeft} maxSeconds={PHASE2_TIME} />
              )}

              <BotCanvas
                key={p2BotKey}
                drawing={p2Drawing}
                playing={true}
                drawDurationMs={BOT_DRAW_DURATION_MS}
                onComplete={handleBotDrawingComplete}
              />

              {/* Hint: appears when 15s or less remain */}
              {!p2GuessCorrect && p2TimeLeft <= 15 && p2TimeLeft > 0 && (
                <div
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl fade-in"
                  style={{
                    background: "rgba(251,191,36,0.07)",
                    border:     "1px solid rgba(251,191,36,0.2)",
                  }}
                >
                  <span className="text-base">💡</span>
                  <span className="text-sm" style={{ color: "var(--text2)" }}>
                    Подсказка:{" "}
                    <span className="font-bold" style={{ color: "var(--text)" }}>
                      {p2Word.ru[0].toUpperCase()}...
                    </span>
                    <span className="ml-2 text-xs" style={{ color: "var(--text3)" }}>
                      {ruLetters(p2Word.ru.replace(/ /g, "").length)}
                    </span>
                  </span>
                </div>
              )}

              <GuessInput
                onGuess={handleGuess}
                disabled={p2GuessCorrect}
                correct={p2GuessCorrect}
              />

              {p2GuessCorrect && (
                <div
                  className="rounded-2xl p-4 text-center"
                  style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)" }}
                >
                  <p className="font-bold text-lg" style={{ color: "var(--green)" }}>
                    🎉 Правильно! +{p2EarnedPoints} очков
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── ROUND OVER: classic (two phases, next round) ───────────────── */}
          {phase === "round_over" && !isDaily && p1Result && p2Result && (
            <div className="phase-enter glass p-5">
              <GameOver
                phase1={p1Result}
                phase2={p2Result}
                roundTotal={p1Result.points + p2Result.points}
                sessionTotal={sessionScore}
                onNext={handleNextRound}
              />
            </div>
          )}

          {/* ── ROUND OVER: daily (single attempt, no replay) ──────────────── */}
          {phase === "round_over" && isDaily && p1Result && (
            <div className="phase-enter glass p-6 flex flex-col items-center gap-5 text-center">
              <span className="text-5xl select-none">{p1Result.success ? "🎉" : "😔"}</span>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: "var(--text3)" }}>
                  Челлендж дня
                </p>
                <p className="text-2xl font-black" style={{ color: "var(--text)" }}>
                  {p1Result.success ? "Бот угадал!" : "Время вышло"}
                </p>
              </div>
              <p className="text-5xl font-black tabular-nums" style={{ color: "var(--yellow)" }}>
                +{p1Result.points}
              </p>
              <p className="text-sm" style={{ color: "var(--text2)" }}>
                Одна попытка в день — возвращайся завтра за новым словом
              </p>
              <button
                onClick={() =>
                  shareResult(
                    { title: "Челлендж дня", score: p1Result.points, scoreLabel: "очков",
                      subtitle: `Слово дня: «${p1Result.word}»` },
                    `Челлендж дня в Draw & Guess: ${p1Result.points} очков! Сможешь лучше?`
                  )
                }
                className="w-full py-3 rounded-xl font-semibold transition-all hover:opacity-80"
                style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.28)", color: "var(--yellow)" }}
              >
                📤 Поделиться результатом
              </button>
              <div className="flex gap-3 w-full">
                <Link href="/daily" className="btn-primary flex-1 py-3 rounded-xl font-bold text-white text-center">
                  Мой результат
                </Link>
                <Link href="/dashboard" className="flex-1 py-3 rounded-xl font-bold text-center"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--border)", color: "var(--text2)" }}>
                  На главную
                </Link>
              </div>
            </div>
          )}

        </div>
      </main>
    </>
  );
}
