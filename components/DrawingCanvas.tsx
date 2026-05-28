"use client";

import { useRef, useEffect, useCallback, useState } from "react";

interface Point {
  x: number;
  y: number;
}

// Logical drawing surface size (CSS-independent coordinate space).
const LOGICAL_SIZE = 400;

interface DrawingCanvasProps {
  onClear?: () => void;
  onStrokeEnd?: () => void;
  disabled?: boolean;
  canvasId?: string;
}

export default function DrawingCanvas({
  onClear,
  onStrokeEnd,
  disabled = false,
  canvasId,
}: DrawingCanvasProps) {
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const isDrawingRef    = useRef(false);
  const lastPointRef    = useRef<Point | null>(null);
  const lastMidpointRef = useRef<Point | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const getCanvasPoint = useCallback(
    (canvas: HTMLCanvasElement, clientX: number, clientY: number): Point => {
      const rect = canvas.getBoundingClientRect();
      // Map CSS pixels → logical drawing space (the context is already scaled by DPR).
      const scaleX = LOGICAL_SIZE / rect.width;
      const scaleY = LOGICAL_SIZE / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Render at device pixel ratio so strokes stay crisp on HiDPI/retina screens.
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = LOGICAL_SIZE * dpr;
    canvas.height = LOGICAL_SIZE * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in logical coordinates
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);
  }, []);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  /** Apply pen style once (avoids repeated setter calls inside draw loop). */
  const applyStyle = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = "#000000";
    ctx.fillStyle   = "#000000";
    // Thin, comfortable pen. predict() applies a light dilation so the model
    // still sees ~QuickDraw-thickness strokes. Recognition stays good while
    // leaving enough challenge that the bot doesn't trivially guess everything.
    ctx.lineWidth   = 9;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
  }, []);

  const startDrawing = useCallback(
    (point: Point) => {
      if (disabled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      isDrawingRef.current    = true;
      lastPointRef.current    = point;
      lastMidpointRef.current = null;

      // Paint a dot so a tap/click without move is visible
      applyStyle(ctx);
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      setIsEmpty(false);
    },
    [disabled, applyStyle]
  );

  const draw = useCallback(
    (point: Point) => {
      if (!isDrawingRef.current || disabled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx || !lastPointRef.current) return;

      const last = lastPointRef.current;
      const mid  = {
        x: (last.x + point.x) / 2,
        y: (last.y + point.y) / 2,
      };

      // Draw from the previous midpoint → current midpoint,
      // using `last` as the quadratic control point.
      // This guarantees continuous curves with zero gaps.
      applyStyle(ctx);
      ctx.beginPath();
      ctx.moveTo(
        lastMidpointRef.current ? lastMidpointRef.current.x : last.x,
        lastMidpointRef.current ? lastMidpointRef.current.y : last.y,
      );
      ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y);
      ctx.stroke();

      lastMidpointRef.current = mid;
      lastPointRef.current    = point;
    },
    [disabled, applyStyle]
  );

  const stopDrawing = useCallback(() => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    // Close the final gap from last midpoint to the actual end point
    if (ctx && lastPointRef.current && lastMidpointRef.current) {
      applyStyle(ctx);
      ctx.beginPath();
      ctx.moveTo(lastMidpointRef.current.x, lastMidpointRef.current.y);
      ctx.lineTo(lastPointRef.current.x,    lastPointRef.current.y);
      ctx.stroke();
    }

    isDrawingRef.current    = false;
    lastPointRef.current    = null;
    lastMidpointRef.current = null;
    onStrokeEnd?.();
  }, [onStrokeEnd, applyStyle]);

  // Mouse events
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      startDrawing(getCanvasPoint(canvas, e.clientX, e.clientY));
    },
    [startDrawing, getCanvasPoint]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      draw(getCanvasPoint(canvas, e.clientX, e.clientY));
    },
    [draw, getCanvasPoint]
  );

  // Touch events
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas || e.touches.length === 0) return;
      const touch = e.touches[0];
      startDrawing(getCanvasPoint(canvas, touch.clientX, touch.clientY));
    },
    [startDrawing, getCanvasPoint]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas || e.touches.length === 0) return;
      const touch = e.touches[0];
      draw(getCanvasPoint(canvas, touch.clientX, touch.clientY));
    },
    [draw, getCanvasPoint]
  );

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);
    setIsEmpty(true);
    onClear?.();
  }, [onClear]);

  const getImageData = useCallback((): ImageData | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, []);

  // Expose getImageData via ref pattern
  useEffect(() => {
    if (canvasRef.current) {
      (canvasRef.current as HTMLCanvasElement & { getImageData: () => ImageData | null }).getImageData = getImageData;
    }
  }, [getImageData]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="w-full rounded-2xl overflow-hidden"
        style={{
          border: "1px solid var(--border-strong)",
          boxShadow: "0 2px 8px rgba(31,28,22,0.08)",
        }}
      >
        <canvas
          ref={canvasRef}
          id={canvasId}
          width={400}
          height={400}
          className="touch-none block"
          style={{
            cursor: disabled ? "not-allowed" : "crosshair",
            maxWidth: "100%",
            width: "100%",
            aspectRatio: "1",
            display: "block",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={stopDrawing}
        />
      </div>
      <button
        onClick={handleClear}
        disabled={disabled || isEmpty}
        className="px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200
                   disabled:opacity-25 disabled:cursor-not-allowed hover:opacity-80"
        style={{
          background: "var(--item-bg)",
          border:     "1px solid var(--border)",
          color:      "var(--text2)",
        }}
      >
        Очистить
      </button>
    </div>
  );
}
