/**
 * Drawing classifier running fully in the browser via TensorFlow.js.
 *
 * A small CNN trained on the QuickDraw dataset (321 classes — one per word in
 * lib/word-list.ts) is loaded from /public/model and run locally. No server,
 * no external API: predict() is fast enough to call on every stroke.
 *
 * Model: tfjs GraphModel, input [1,28,28,1] float (white strokes on black,
 * values 0..1), output [1,321] softmax. Class index → word maps via labels.json
 * (same order the model was trained on; each label equals a word-list `en`).
 */
import * as tf from "@tensorflow/tfjs";

export type Prediction = { label: string; confidence: number };

const MODEL_URL = "/model/model.json";
const LABELS_URL = "/model/labels.json";
const SIZE = 28; // model input side
const TARGET = 26; // drawing is scaled to fit this box, centered in SIZE.
// 26 was found (ml/parity_check.py) to best match QuickDraw's native scale:
// top-3 84.6% vs 84.8% baseline. Smaller shrinks the drawing off-distribution.
const INK_THRESHOLD = 128; // luminance below this counts as ink (canvas is black-on-white)

let model: tf.GraphModel | null = null;
let labels: string[] = [];
let ready = false;
let loading: Promise<void> | null = null;

export function isModelReady(): boolean {
  return ready;
}

export async function initModel(
  onProgress?: (progress: number) => void
): Promise<void> {
  if (ready) {
    onProgress?.(1);
    return;
  }
  if (loading) return loading;

  loading = (async () => {
    onProgress?.(0.1);
    await tf.ready();
    onProgress?.(0.3);

    const [m, lbl] = await Promise.all([
      tf.loadGraphModel(MODEL_URL),
      fetch(LABELS_URL).then((r) => r.json() as Promise<string[]>),
    ]);
    model = m;
    labels = lbl;
    onProgress?.(0.85);

    // Warm up the backend so the first real predict isn't slow.
    const warm = tf.zeros([1, SIZE, SIZE, 1]);
    const out = model.predict(warm) as tf.Tensor;
    out.dataSync();
    warm.dispose();
    out.dispose();

    ready = true;
    onProgress?.(1);
  })();

  return loading;
}

/**
 * Convert the game canvas (black strokes on white) into the model's input:
 * crop to ink bounding box, scale to fit a centered 24×24 region, invert to
 * white-strokes-on-black, normalise to [0,1]. Returns null if the canvas is empty.
 */
function preprocess(src: HTMLCanvasElement): Float32Array | null {
  const sctx = src.getContext("2d");
  if (!sctx) return null;
  const W = src.width;
  const H = src.height;
  const data = sctx.getImageData(0, 0, W, H).data;

  // Find the bounding box of the ink.
  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      const lum = (data[o] + data[o + 1] + data[o + 2]) / 3;
      if (lum < INK_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null; // nothing drawn

  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;

  // Build an inverted (white-on-black) crop of just the bounding box.
  const crop = sctx.getImageData(minX, minY, bw, bh);
  const cd = crop.data;
  for (let i = 0; i < cd.length; i += 4) {
    const v = 255 - (cd[i] + cd[i + 1] + cd[i + 2]) / 3; // ink → high
    cd[i] = cd[i + 1] = cd[i + 2] = v;
    cd[i + 3] = 255;
  }
  const inv = document.createElement("canvas");
  inv.width = bw;
  inv.height = bh;
  inv.getContext("2d")!.putImageData(crop, 0, 0);

  // Scale + centre onto a 28×28 black canvas.
  const scale = TARGET / Math.max(bw, bh);
  const dw = bw * scale;
  const dh = bh * scale;
  const ox = (SIZE - dw) / 2;
  const oy = (SIZE - dh) / 2;

  const out = document.createElement("canvas");
  out.width = SIZE;
  out.height = SIZE;
  const octx = out.getContext("2d")!;
  octx.fillStyle = "black";
  octx.fillRect(0, 0, SIZE, SIZE);
  octx.imageSmoothingEnabled = true;
  octx.drawImage(inv, 0, 0, bw, bh, ox, oy, dw, dh);

  const od = octx.getImageData(0, 0, SIZE, SIZE).data;
  const raw = new Float32Array(SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) raw[i] = od[i * 4] / 255; // grayscale, white-on-black

  // Thin canvas pen shrinks below ~1px after downscaling; a light 4-neighbour
  // max-dilation lifts strokes back toward QuickDraw thickness.
  const f = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let m = raw[y * SIZE + x];
      if (x > 0)        m = Math.max(m, raw[y * SIZE + x - 1]);
      if (x < SIZE - 1) m = Math.max(m, raw[y * SIZE + x + 1]);
      if (y > 0)        m = Math.max(m, raw[(y - 1) * SIZE + x]);
      if (y < SIZE - 1) m = Math.max(m, raw[(y + 1) * SIZE + x]);
      f[y * SIZE + x] = m;
    }
  }
  return f;
}

export async function predict(
  canvas: HTMLCanvasElement
): Promise<Prediction[]> {
  if (!model) return [];
  const input = preprocess(canvas);
  if (!input) return [];

  const probs = tf.tidy(() => {
    const t = tf.tensor4d(input, [1, SIZE, SIZE, 1]);
    const out = model!.predict(t) as tf.Tensor;
    return out.dataSync() as Float32Array;
  });

  // Top-3 by probability — confidences are real softmax outputs.
  const top = Array.from(probs.keys())
    .sort((a, b) => probs[b] - probs[a])
    .slice(0, 3)
    .map((i) => ({ label: labels[i] ?? String(i), confidence: probs[i] }));
  return top;
}
