/**
 * Client-side share card: renders a branded PNG of the player's result on an
 * offscreen canvas, then shares it (Web Share API with file) or falls back to
 * downloading the image + copying the site link.
 */

const W = 1200;
const H = 630;

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export interface ShareCardData {
  title: string;        // e.g. "Мой результат" or "Челлендж дня"
  score: number;        // big number
  scoreLabel: string;   // e.g. "очков" / "очков за сессию"
  subtitle?: string;    // e.g. "🏆 Рекорд: 1200" or "#47 из 1203 · 🔥 5 дней"
}

export function renderShareCard(d: ShareCardData): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0b0b18");
  bg.addColorStop(1, "#14122a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Accent glow blob
  const glow = ctx.createRadialGradient(W * 0.5, 220, 0, W * 0.5, 220, 520);
  glow.addColorStop(0, "rgba(99,102,241,0.30)");
  glow.addColorStop(1, "rgba(99,102,241,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Card frame
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  rounded(ctx, 40, 40, W - 80, H - 80, 32);
  ctx.stroke();

  ctx.textAlign = "center";

  // Brand
  ctx.font = "800 44px Inter, system-ui, sans-serif";
  ctx.fillStyle = "#a78bfa";
  ctx.fillText("🎨 Draw & Guess", W / 2, 130);

  // Title
  ctx.font = "600 30px Inter, system-ui, sans-serif";
  ctx.fillStyle = "rgba(240,240,248,0.6)";
  ctx.fillText(d.title.toUpperCase(), W / 2, 220);

  // Big score
  ctx.font = "900 200px Inter, system-ui, sans-serif";
  ctx.fillStyle = "#fbbf24";
  ctx.fillText(String(d.score), W / 2, 400);

  // Score label
  ctx.font = "700 34px Inter, system-ui, sans-serif";
  ctx.fillStyle = "rgba(240,240,248,0.85)";
  ctx.fillText(d.scoreLabel, W / 2, 460);

  // Subtitle
  if (d.subtitle) {
    ctx.font = "600 30px Inter, system-ui, sans-serif";
    ctx.fillStyle = "rgba(240,240,248,0.55)";
    ctx.fillText(d.subtitle, W / 2, 520);
  }

  // Footer URL
  ctx.font = "700 30px Inter, system-ui, sans-serif";
  ctx.fillStyle = "#818cf8";
  ctx.fillText("draw-game-tan.vercel.app", W / 2, H - 70);

  return c;
}

function canvasToBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png")
  );
}

/** Share the result card. Returns a short status for optional UI feedback. */
export async function shareResult(d: ShareCardData, shareText: string): Promise<"shared" | "downloaded"> {
  const canvas = renderShareCard(d);
  const blob = await canvasToBlob(canvas);
  const url = typeof location !== "undefined" ? location.origin : "https://draw-game-tan.vercel.app";
  const file = new File([blob], "draw-and-guess.png", { type: "image/png" });

  // Native share with image where supported (mobile / some desktop)
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text: shareText, url });
      return "shared";
    } catch {
      /* user cancelled or failed — fall through to download */
    }
  }

  // Fallback: download the PNG + copy the link
  const dl = document.createElement("a");
  dl.href = URL.createObjectURL(blob);
  dl.download = "draw-and-guess.png";
  dl.click();
  URL.revokeObjectURL(dl.href);
  try {
    await navigator.clipboard?.writeText(`${shareText} ${url}`);
  } catch {
    /* clipboard may be blocked — image still downloaded */
  }
  return "downloaded";
}
