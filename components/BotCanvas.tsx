"use client";

import { useRef, useEffect, useCallback } from "react";
import type { QuickDrawDrawing } from "@/lib/drawings-loader";

const CANVAS_SIZE = 400;
// QuickDraw coords are roughly 0-255; add padding
const SCALE = (CANVAS_SIZE - 40) / 255;
const OFFSET = 20;

const STROKE_GAP_MS = 200; // pause between strokes (ms)
const MIN_POINT_DELAY_MS = 8; // floor so animation stays smooth

interface BotCanvasProps {
  drawing: QuickDrawDrawing | null;
  onComplete?: () => void;
  playing?: boolean;
  /** Target duration for the whole drawing in ms (default 8000 = 8s) */
  drawDurationMs?: number;
}

export default function BotCanvas({
  drawing,
  onComplete,
  playing = true,
  drawDurationMs = 8000,
}: BotCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const completedRef = useRef(false);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    initCanvas();
    completedRef.current = false;

    if (!drawing || !playing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Compute per-point delay so total drawing time ≈ drawDurationMs
    const totalPoints = drawing.reduce((sum, stroke) => sum + stroke[0].length, 0);
    const totalGapTime = drawing.length * STROKE_GAP_MS;
    const pointDelayMs =
      totalPoints > 0
        ? Math.max(MIN_POINT_DELAY_MS, (drawDurationMs - totalGapTime) / totalPoints)
        : MIN_POINT_DELAY_MS;

    let strokeIdx = 0;
    let pointIdx = 0;
    let lastTime = 0;
    let inStrokeGap = false;
    let strokeGapStart = 0;

    function tick(now: number) {
      if (strokeIdx >= drawing!.length) {
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete?.();
        }
        return;
      }

      const stroke = drawing![strokeIdx];
      const xs = stroke[0];
      const ys = stroke[1];

      // gap between strokes
      if (inStrokeGap) {
        if (now - strokeGapStart < STROKE_GAP_MS) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        inStrokeGap = false;
        pointIdx = 0;
        strokeIdx++;
        if (strokeIdx >= drawing!.length) {
          if (!completedRef.current) {
            completedRef.current = true;
            onComplete?.();
          }
          return;
        }
      }

      if (now - lastTime < pointDelayMs) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      lastTime = now;

      const x = xs[pointIdx] * SCALE + OFFSET;
      const y = ys[pointIdx] * SCALE + OFFSET;

      if (pointIdx === 0) {
        ctx!.beginPath();
        ctx!.moveTo(x, y);
      } else {
        const prevX = xs[pointIdx - 1] * SCALE + OFFSET;
        const prevY = ys[pointIdx - 1] * SCALE + OFFSET;
        ctx!.beginPath();
        ctx!.moveTo(prevX, prevY);
        ctx!.lineTo(x, y);
        ctx!.stroke();
      }

      pointIdx++;
      if (pointIdx >= xs.length) {
        inStrokeGap = true;
        strokeGapStart = now;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [drawing, playing, onComplete, initCanvas, drawDurationMs]);

  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      style={{
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 0 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="block"
        style={{ maxWidth: "100%", width: "100%", aspectRatio: "1", display: "block" }}
      />
    </div>
  );
}
