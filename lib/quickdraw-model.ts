/**
 * QuickDraw classifier using k-NN with TF.js.
 * At init time: rasterizes downloaded drawings → builds a normalized gallery tensor.
 * At inference time: cosine similarity between user's drawing and all gallery vectors,
 * aggregated per word → top-3 predictions.
 *
 * No external model URL required — the "training data" is our /public/drawings/*.json.
 */

import * as tf from "@tensorflow/tfjs";
import { WORD_LIST } from "./word-list";

const SAMPLES_PER_WORD = 30;
const IMG_SIZE = 28;
const STROKE_WIDTH = 6;

// Gallery state
let gallery: tf.Tensor2D | null = null; // [N, 784] normalized
let galleryLabels: string[] = [];

export type Prediction = { label: string; confidence: number };

// ─── Rasterize QuickDraw strokes ─────────────────────────────────────────────

function rasterizeStrokes(strokes: [number[], number[]][]): Float32Array {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = STROKE_WIDTH;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const [xs, ys] of strokes) {
    ctx.beginPath();
    ctx.moveTo(xs[0], ys[0]);
    for (let i = 1; i < xs.length; i++) {
      ctx.lineTo(xs[i], ys[i]);
    }
    ctx.stroke();
  }

  // Scale down to 28×28
  const small = document.createElement("canvas");
  small.width = IMG_SIZE;
  small.height = IMG_SIZE;
  const sc = small.getContext("2d")!;
  sc.drawImage(canvas, 0, 0, IMG_SIZE, IMG_SIZE);

  const { data } = sc.getImageData(0, 0, IMG_SIZE, IMG_SIZE);
  const vec = new Float32Array(IMG_SIZE * IMG_SIZE);
  for (let i = 0; i < IMG_SIZE * IMG_SIZE; i++) {
    vec[i] = data[i * 4] / 255; // red channel; 1 = ink, 0 = background
  }
  return vec;
}

// ─── Preprocess user's canvas ────────────────────────────────────────────────

function preprocessUserCanvas(canvas: HTMLCanvasElement): Float32Array | null {
  const ctx = canvas.getContext("2d")!;
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Find bounding box of ink (dark pixels on white background)
  let x0 = width, y0 = height, x1 = 0, y1 = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i] < 128) { // dark pixel = ink
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }

  if (x0 > x1 || y0 > y1) return null; // empty canvas

  // 15% padding around bounding box
  const pw = Math.ceil((x1 - x0) * 0.15) + 2;
  const ph = Math.ceil((y1 - y0) * 0.15) + 2;
  x0 = Math.max(0, x0 - pw);
  y0 = Math.max(0, y0 - ph);
  x1 = Math.min(width - 1, x1 + pw);
  y1 = Math.min(height - 1, y1 + ph);

  // Render cropped region → 28×28
  const small = document.createElement("canvas");
  small.width = IMG_SIZE;
  small.height = IMG_SIZE;
  const sc = small.getContext("2d")!;
  // White background first
  sc.fillStyle = "#fff";
  sc.fillRect(0, 0, IMG_SIZE, IMG_SIZE);
  sc.drawImage(canvas, x0, y0, x1 - x0 + 1, y1 - y0 + 1, 0, 0, IMG_SIZE, IMG_SIZE);

  const { data: d2 } = sc.getImageData(0, 0, IMG_SIZE, IMG_SIZE);
  const vec = new Float32Array(IMG_SIZE * IMG_SIZE);
  for (let i = 0; i < IMG_SIZE * IMG_SIZE; i++) {
    // Invert: ink (dark) → 1, background (white) → 0, matching gallery format
    vec[i] = 1 - d2[i * 4] / 255;
  }
  return vec;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function initModel(
  onProgress?: (progress: number) => void
): Promise<void> {
  const allVecs: Float32Array[] = [];
  galleryLabels = [];

  for (let wi = 0; wi < WORD_LIST.length; wi++) {
    const word = WORD_LIST[wi];
    try {
      const res = await fetch(`/drawings/${word.en}.json`);
      const drawings: { strokes: [number[], number[]][] }[] = await res.json();
      const samples = drawings.slice(0, SAMPLES_PER_WORD);
      for (const d of samples) {
        allVecs.push(rasterizeStrokes(d.strokes));
        galleryLabels.push(word.en);
      }
    } catch {
      console.warn(`[quickdraw-model] no drawings for "${word.en}"`);
    }
    onProgress?.((wi + 1) / WORD_LIST.length);
    // Yield to UI thread
    await new Promise((r) => setTimeout(r, 0));
  }

  if (gallery) gallery.dispose();

  const n = allVecs.length;
  const flat = new Float32Array(n * IMG_SIZE * IMG_SIZE);
  for (let i = 0; i < n; i++) flat.set(allVecs[i], i * IMG_SIZE * IMG_SIZE);

  const raw = tf.tensor2d(flat, [n, IMG_SIZE * IMG_SIZE]);
  // L2-normalize each row so dot-product = cosine similarity
  const norms = raw.norm("euclidean", 1, true);
  gallery = raw.div(norms.add(1e-8)) as tf.Tensor2D;
  raw.dispose();
  norms.dispose();
}

export async function predict(
  canvas: HTMLCanvasElement
): Promise<Prediction[]> {
  if (!gallery || galleryLabels.length === 0) return [];

  const rawVec = preprocessUserCanvas(canvas);
  if (!rawVec) return [];

  const sims = tf.tidy(() => {
    const userT = tf.tensor1d(rawVec);
    const norm = userT.norm().add(1e-8);
    const userNorm = userT.div(norm); // [784]
    const userCol = userNorm.reshape([IMG_SIZE * IMG_SIZE, 1]) as tf.Tensor2D;
    return gallery!.matMul(userCol).reshape([galleryLabels.length]); // [N]
  });

  const simsData = await sims.data();
  sims.dispose();

  // Aggregate: per word, take mean of top-5 cosine similarities
  const wordSims = new Map<string, number[]>();
  for (let i = 0; i < galleryLabels.length; i++) {
    const w = galleryLabels[i];
    const arr = wordSims.get(w) ?? [];
    arr.push(simsData[i]);
    wordSims.set(w, arr);
  }

  const sorted = [...wordSims.entries()]
    .map(([label, sims]) => {
      // Mean of top-5 similarities
      const top5 = sims.sort((a, b) => b - a).slice(0, 5);
      const score = top5.reduce((s, v) => s + v, 0) / top5.length;
      return { label, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // Normalize to [0,1] relative to the best score for display
  const best = sorted[0]?.score ?? 1;
  const worst = sorted[sorted.length - 1]?.score ?? 0;
  const range = Math.max(best - worst, 0.001);

  return sorted.map(({ label, score }) => ({
    label,
    confidence: (score - worst) / range,
  }));
}

export function isModelReady(): boolean {
  return gallery !== null;
}
