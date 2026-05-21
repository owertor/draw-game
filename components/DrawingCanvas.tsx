"use client";

import { useRef, useEffect, useCallback, useState } from "react";

interface Point {
  x: number;
  y: number;
}

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const getCanvasPoint = useCallback(
    (canvas: HTMLCanvasElement, clientX: number, clientY: number): Point => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
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
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  const startDrawing = useCallback(
    (point: Point) => {
      if (disabled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      isDrawingRef.current = true;
      lastPointRef.current = point;

      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#000000";
      ctx.fill();
      setIsEmpty(false);
    },
    [disabled]
  );

  const draw = useCallback(
    (point: Point) => {
      if (!isDrawingRef.current || disabled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx || !lastPointRef.current) return;

      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.quadraticCurveTo(
        lastPointRef.current.x,
        lastPointRef.current.y,
        (lastPointRef.current.x + point.x) / 2,
        (lastPointRef.current.y + point.y) / 2
      );
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      lastPointRef.current = point;
    },
    [disabled]
  );

  const stopDrawing = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    onStrokeEnd?.();
  }, [onStrokeEnd]);

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
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 0 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
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
          background: "rgba(255,255,255,0.05)",
          border:     "1px solid rgba(255,255,255,0.1)",
          color:      "var(--text2)",
        }}
      >
        Очистить
      </button>
    </div>
  );
}
