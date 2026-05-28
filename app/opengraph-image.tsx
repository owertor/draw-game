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
          background: "#f4f1ea",
          color: "#211d17",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 120 }}>🎨</div>
        <div style={{ fontSize: 88, fontWeight: 800, color: "#211d17", marginTop: 8, letterSpacing: "-0.03em" }}>
          Draw &amp; Guess
        </div>
        <div style={{ fontSize: 40, color: "rgba(33,29,23,0.62)", marginTop: 16 }}>
          Рисуй — бот угадывает. Бот рисует — угадываешь ты.
        </div>
        <div style={{ fontSize: 30, color: "#b05833", marginTop: 40, fontWeight: 600 }}>
          draw-game-tan.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}
