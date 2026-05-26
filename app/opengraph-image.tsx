import { ImageResponse } from "next/og";

export const alt = "Draw & Guess";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0b0b18 0%, #14122a 100%)",
          color: "#f0f0f8",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 120 }}>🎨</div>
        <div style={{ fontSize: 88, fontWeight: 900, color: "#a78bfa", marginTop: 8 }}>
          Draw &amp; Guess
        </div>
        <div style={{ fontSize: 40, color: "rgba(240,240,248,0.65)", marginTop: 16 }}>
          Рисуй — бот угадывает. Бот рисует — угадываешь ты.
        </div>
        <div style={{ fontSize: 30, color: "#818cf8", marginTop: 40 }}>
          draw-game-tan.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}
