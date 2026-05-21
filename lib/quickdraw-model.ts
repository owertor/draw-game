/**
 * Drawing classifier using Claude API Vision (claude-haiku-4-5).
 *
 * predict() converts the canvas to a PNG, sends it to /api/guess,
 * and returns the top-3 most likely words from the game's word list.
 *
 * No TF.js, no local model — the heavy lifting is done server-side by Claude.
 */

export type Prediction = { label: string; confidence: number };

// No model to load: always ready from the start.
let ready = true;

export async function initModel(
  onProgress?: (progress: number) => void
): Promise<void> {
  onProgress?.(1.0);
  ready = true;
}

export function isModelReady(): boolean {
  return ready;
}

/** Resize canvas to targetSize×targetSize before encoding to cut image tokens ~9×. */
function resizeCanvas(src: HTMLCanvasElement, targetSize = 128): string {
  const off = document.createElement("canvas");
  off.width  = targetSize;
  off.height = targetSize;
  const ctx = off.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(src, 0, 0, targetSize, targetSize);
  return off.toDataURL("image/png").split(",")[1] ?? "";
}

export async function predict(
  canvas: HTMLCanvasElement
): Promise<Prediction[]> {
  const base64 = resizeCanvas(canvas, 200);
  if (!base64) return [];

  try {
    const res = await fetch("/api/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: base64 }),
    });

    if (!res.ok) return [];

    const { predictions } = (await res.json()) as { predictions: string[] };
    if (!Array.isArray(predictions) || predictions.length === 0) return [];

    // Assign fixed relative confidence for display bars: 100% / 70% / 40%
    return predictions.map((label, i) => ({
      label,
      confidence: 1 - i * 0.3,
    }));
  } catch {
    return [];
  }
}
