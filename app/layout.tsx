import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import AuthGate from "@/components/AuthGate";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://draw-game-tan.vercel.app"),
  title: "Draw & Guess — рисуй, бот угадывает",
  description:
    "Рисуй слово — нейросеть угадывает прямо в браузере. Бот рисует — угадываешь ты. Ежедневный челлендж, лидерборды, достижения.",
  openGraph: {
    title: "Draw & Guess",
    description: "Рисуй — бот угадывает. Бот рисует — угадываешь ты.",
    type: "website",
    locale: "ru_RU",
    siteName: "Draw & Guess",
  },
  twitter: {
    card: "summary_large_image",
    title: "Draw & Guess",
    description: "Рисуй — бот угадывает. Бот рисует — угадываешь ты.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`h-full ${manrope.variable}`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <AuthGate />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
