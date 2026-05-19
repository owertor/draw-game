"use client";

import { useRef, useEffect, useCallback } from "react";
import type { QuickDrawDrawing } from "@/lib/drawings-loader";

const CANVAS_SIZE = 400;
// QuickDraw coords are roughly 0-255; add padding
const SCALE = (CANVAS_SIZE - 40) / 255;
const OFFSET = 20;

const POINT_DELAY_MS = 12;
const STROKE_GAP_MS = 120;

interface BotCanvasProps {
  drawing: QuickDrawDrawing | null;
  onComplete?: () => void;
  playing?: boolean;
}

export default function BotCanvas({ drawing, onComplete, playing = true }: BotCanvasProps) {
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

      if (now - lastTime < POINT_DELAY_MS) {
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
  }, [drawing, playing, onComplete, initCanvas]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="rounded-xl"
      style={{
        border: "2px solid #2a2a2a",
        maxWidth: "100%",
        aspectRatio: "1",
      }}
    />
  );
}
