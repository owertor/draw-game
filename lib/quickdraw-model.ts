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

export async function predict(
  canvas: HTMLCanvasElement
): Promise<Prediction[]> {
  // Convert canvas to base64 PNG (no preprocessing needed — Claude handles it)
  const dataUrl = canvas.toDataURL("image/png");
  const base64 = dataUrl.split(",")[1];
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
