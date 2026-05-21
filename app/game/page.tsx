"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import DrawingCanvas from "@/components/DrawingCanvas";
import BotCanvas from "@/components/BotCanvas";
import ModelLoader from "@/components/ModelLoader";
import Timer from "@/components/Timer";
import GuessInput from "@/components/GuessInput";
import ScoreBoard from "@/components/ScoreBoard";
import GameOver from "@/components/GameOver";
import { predict, type Prediction } from "@/lib/quickdraw-model";
import { checkAnswer } from "@/lib/fuzzy-match";
import { WORD_LIST, getRandomWord, getWordByEn, type WordEntry } from "@/lib/word-list";
import { getRandomDrawing, type QuickDrawDrawing } from "@/lib/drawings-loader";
import { getBestScore, saveGameResult } from "@/lib/storage";
import { Sounds } from "@/lib/sounds";

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
  const [modelReady, setModelReady] = useState(false);
  const modelReadyRef = useRef(false);

  // Game state
  const [phase, setPhase] = useState<Phase>("idle");
  const [roundNumber, setRoundNumber] = useState(1);
  const [sessionScore, setSessionScore] = useState(0);
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

  // ── End round ─────────────────────────────────────────────────────────────
  const endRound = useCallback(
    (p1: RoundResult, p2: RoundResult) => {
      clearTimer();
      const total = p1.points + p2.points;
      if (total === 0) Sounds.fail();
      setP1Result(p1);
      setP2Result(p2);
      setRoundScore(total);
      setSessionScore((prev) => {
        const newTotal = prev + total;
        saveGameResult(newTotal);
        return newTotal;
      });
      setBestScore(getBestScore());
      setPhase("round_over");
      phaseRef.current = "round_over";
    },
    [clearTimer]
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

  // ── Phase 1: realtime prediction ──────────────────────────────────────────
  const runPredict = useCallback(async () => {
    if (!modelReadyRef.current || p1SuccessRef.current) return;
    const canvas = document.getElementById("game-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const results = await predict(canvas);
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
      // Start phase 2 after brief delay
      setTimeout(() => startPhase2(), 1500);
    }
  }, [p1Word, p1TimeLeft, clearTimer]);

  const handleStrokeEnd = useCallback(() => {
    if (predictThrottleRef.current) return;
    predictThrottleRef.current = setTimeout(() => {
      predictThrottleRef.current = null;
      runPredict();
    }, 500);
  }, [runPredict]);

  // ── Start Phase 1 ─────────────────────────────────────────────────────────
  const startPhase1 = useCallback(() => {
    Sounds.start();
    const word = getRandomWord();
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
          setTimeout(() => startPhase2(), 1200);
        }
      }
    }, 1000);
  }, []);

  // ── Start Phase 2 ─────────────────────────────────────────────────────────
  const startPhase2 = useCallback(async () => {
    // Pick a different word from p1 if possible
    const available = WORD_LIST.filter((w) => w.en !== p1Word?.en);
    const word = available[Math.floor(Math.random() * available.length)];
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
  }, [p1Word, endPhase2]);

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

      <main className="flex flex-col items-center min-h-screen p-4 gap-4 pb-8">
        <header className="w-full max-w-lg flex items-center justify-between pt-4">
          <Link href="/" className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm">
            ← Меню
          </Link>
          <h1 className="text-xl font-bold text-indigo-400">Draw & Guess</h1>
          <div className="w-16" />
        </header>

        <div className="w-full max-w-lg flex flex-col gap-4">

          {/* ScoreBoard — always visible in active rounds */}
          {phase !== "idle" && (
            <ScoreBoard
              roundScore={roundScore}
              totalScore={sessionScore}
              roundNumber={roundNumber}
              bestScore={bestScore}
            />
          )}

          {/* ── IDLE ─────────────────────────────── */}
          {phase === "idle" && (
            <div className="phase-enter bg-zinc-900 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center gap-6">
              <div className="text-center">
                <p className="text-zinc-400 mb-2">Нажми, чтобы начать</p>
                <p className="text-zinc-500 text-sm">Бот распознаёт рисунки с помощью Claude AI</p>
              </div>
              <button
                onClick={startPhase1}
                disabled={!modelReady}
                className="w-full py-4 px-6 rounded-xl font-bold text-lg text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {modelReady ? "Начать!" : "Загрузка модели…"}
              </button>
            </div>
          )}

          {/* ── PHASE 1: Player draws ─────────────── */}
          {phase === "player_drawing" && p1Word && (
            <div className="phase-enter bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-500 text-xs">Нарисуй:</p>
                  <p className="text-3xl font-bold text-white">{p1Word.ru}</p>
                </div>
                <div className="text-right text-xs text-zinc-500">
                  <p>Фаза 1</p>
                  <p>Бот угадывает</p>
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
                  <p className="text-zinc-500 text-xs">Бот думает:</p>
                  {p1Predictions.map(({ label, confidence }, i) => {
                    const word = getWordByEn(label);
                    // Russian if it's a game word, otherwise English with underscores replaced
                    const displayName = word?.ru ?? label.replace(/_/g, " ");
                    const isTarget = label === p1Word?.en;
                    const pct = Math.round(confidence * 100);
                    return (
                      <div key={label} className="flex items-center gap-2">
                        <span className="text-zinc-600 text-xs w-4">{i + 1}.</span>
                        <div className="flex-1 h-6 bg-zinc-800 rounded-lg overflow-hidden relative">
                          <div
                            className="h-full rounded-lg transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              background: isTarget ? "#22c55e" : i === 0 ? "#6366f1" : "#374151",
                            }}
                          />
                          <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-white">
                            {displayName}
                            {isTarget && " ✓"}
                          </span>
                        </div>
                        <span className="text-zinc-500 text-xs w-8 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {p1Success && (
                <p className="text-green-400 text-center font-semibold animate-pulse">
                  Бот угадал! +{p1TimeLeft * POINTS_PER_SECOND} очков
                </p>
              )}
            </div>
          )}

          {/* ── PHASE 2: Bot draws ────────────────── */}
          {phase === "bot_drawing" && p2Word && (
            <div className="phase-enter bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-500 text-xs">
                    {p2BotDone ? "Бот нарисовал — угадай что!" : "Бот рисует — угадывай по ходу!"}
                  </p>
                </div>
                <div className="text-right text-xs text-zinc-500">
                  <p>Фаза 2</p>
                  <p>Ты угадываешь</p>
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

              <GuessInput
                onGuess={handleGuess}
                disabled={p2GuessCorrect}
                correct={p2GuessCorrect}
              />

              {p2GuessCorrect && (
                <p className="text-green-400 text-center font-semibold animate-pulse">
                  Правильно! +{p2EarnedPoints} очков
                </p>
              )}
            </div>
          )}

          {/* ── ROUND OVER ───────────────────────── */}
          {phase === "round_over" && p1Result && p2Result && (
            <div className="phase-enter bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <GameOver
                phase1={p1Result}
                phase2={p2Result}
                roundTotal={p1Result.points + p2Result.points}
                sessionTotal={sessionScore}
                onNext={handleNextRound}
              />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
